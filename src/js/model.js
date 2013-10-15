"use strict";
(function () {

    var converters = {};
    var Frzn = {
        version: "1.0",
        /**
         * Utility function to define a model attribute
         * @param type The type of attribute. Default to 'string'
         * @returns a computed property for the given attribute
         * @param options An hash describing the attribute. Accepted values are:
         *      defaultValue: a default value for the field when it is not defined (not valid for relationships)
         */
        attr: function (type, options) {
            type = type || 'string';
            options = options || {};
            return function (key, value) {
                this._initField(key, options);
                var converter = Frzn.getConverter(type);
                var path = '_data.' + key;
                if (arguments.length > 1) {
                    if(options.isRelationship) {
                        path = '_data.' + key + '.content'; //use wrapped content in Ember proxy object
                    }
                    var oldValue = this.get(path);
                    value = converter.convert(value, options);
                    this.set(path, value);
                    if(oldValue != value)
                        this._markDirty(key);
                } else {
                    value = this.get(path);
                    if(options.isRelationship && !options.embedded) {
                        value.set('content', options.destination.find(this.get('_data.'+key+'.id'))); //TODO: fix for generic id mapping needed
                    }
                }
                return value;
            }.property('_data').cacheable(false).meta({type: type, options: options});
        },

        hasMany: function (destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : true;
            Frzn.registerConverter("hasMany"+destination, ModelArrayConverter.extend({}));
            return Frzn.attr("hasMany"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'hasMany', destination: destination}))
        },

        hasOne: function(destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : true;
            Frzn.registerConverter("hasOne"+destination, ModelConverter.extend({}));
            return Frzn.attr("hasOne"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'hasOne', destination: destination}))
        },

        belongsTo: function(destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : true;
            Frzn.registerConverter("belongsTo"+destination, ModelConverter.extend({}));
            return Frzn.attr("belongsTo"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'belongsTo', destination: destination}))
        },

        registerConverter: function(name, converter) {
            converters[name] = converter.create();
        },

        getConverter: function(name) {
            return converters[name] || SimpleConverter.create({});
        }
    };

    var SimpleConverter = Ember.Object.extend({
        convert: function(value) {
            if(value)
                return value.valueOf();
            return value;
        }
    });

    var ModelConverter = Ember.Object.extend({
        convert: function(value, options) {
            if(value instanceof options.destination)
                return value;
            else {
                if(typeof value === 'object') {
                    //try to build a new destination object
                    return options.destination.create(value);
                }
            }
            return null;
        }
    });

    var ModelArrayConverter = Ember.Object.extend({
        convert: function(value, options) {
            if(value instanceof Array) {
                var array = [];
                for(var i = 0; i < value.length; i++) {
                    array.push(options.destination.create(value[i]))
                }
                return array;
            }
            return null;
        }
    });

    Frzn.registerConverter('string', SimpleConverter.extend({
        convert: function(value) {
            if(!Ember.isEmpty(value))
                return (new String(value)).valueOf();
            else
                return value;
        }
    }));

    Frzn.registerConverter('boolean', SimpleConverter.extend({
        convert: function(value) {
            return !!value;
        }
    }));

    Frzn.registerConverter('object', SimpleConverter.extend({
        convert: function(value) {
            return value;
        }
    }));

    Frzn.registerConverter('number', SimpleConverter.extend({
        convert: function(value) {
            if(value !== null && value !== undefined) {
                var num = new Number(value);
                return num.valueOf();
            }
            return value;
        }
    }));

    Frzn.registerConverter('date', SimpleConverter.extend({
        convert: function(value) {
            if(value !== null && value !== undefined) {
                if(typeof value === 'string') {
                    var d = new Date(Date.parse(value));
                    if(isNaN(d.getTime()))
                        return null;
                    else
                        return d;
                }
                else if (value instanceof Date)
                    return value;
                else
                    return null;
            }
            return value;
        }
    }));

    var Relationship = Em.Mixin.create({
        getObjectClass: function() {
            return this.get('options.destination');
        }
    });

    var HasManyRelationship = Ember.ArrayProxy.extend(Relationship, {
        init: function () {
            this.set('content', Em.A([]));
            this._super();
        },

        create: function(data) {
            var o = this.get('options.destination').create(data);
            this.pushObject(o);
            return o;
        }
    });

    var HasOneRelationship = Ember.ObjectProxy.extend(Relationship, {
    });

    var BelongsToRelationship = Ember.ObjectProxy.extend(Relationship, {
    });

    var relationships = {
        hasOne: HasOneRelationship,
        hasMany: HasManyRelationship,
        belongsTo: BelongsToRelationship,
    };

    Frzn.Model = Ember.Object.extend(Ember.DeferredMixin, Ember.Evented, {
        isAjax: false,
        isLoaded: false,
        isSaved: false,
        isDeleted: false,
        url: null,
        errors: null,

        _backup: function() {
            if(!this.__backup)
                this.__backup = {};
            return this.__backup;
        }.property().cacheable(),

        _data: function() {
            if(!this.__data)
                this.__data = Em.Object.create({});
            return this.__data;
        }.property(),

        _dirtyAttributes: function() {
            if(!this.__dirtyAttributes)
                this.__dirtyAttributes = [];
            return this.__dirtyAttributes;
        }.property(),

        _properties: function() {
            if(!this.__properties)
                this.__properties = Em.A([]);
            return this.__properties;
        }.property(),

        _relationships: function() {
            if(!this.__relationships)
                this.__relationships = Em.Object.create({});
            return this.__relationships;
        }.property(),

        _initField: function(name, options) {
            if(this.get('_backup').hasOwnProperty(name) === false) {
                Ember.assert("Field name must not be null", name !== null && name !== undefined && name != "");
                options = options || {};
                if(options.isRelationship) {
                    //For relationships we create a wrapper object using Ember proxies
                    if(typeof options.destination == 'string') {
                        var dst = Ember.get(options.destination);
                        if(!dst) {
                            var s = options.destination.split('.');
                            if(s.length) {
                                dst = Ember.Namespace.byName(s[0]).get(s.slice(1).join('.'));
                            }
                        }
                        Ember.assert("You must provide a valid model class", !!dst);
                        options.destination = dst;
                    }
                    var rel = relationships[options.relationshipType].create({
                        type: options.relationshipType,
                        options: options
                    });
                    this.set('_relationships.' + name, rel);
                    this.get('_backup')[name] = rel;
                    this.set('_data.' + name, rel);
                } else {
                    this.get('_backup')[name] = options.defaultValue;
                    this.set('_data.' + name, options.defaultValue);
                }
                var properties = this.get('_properties');
                if(-1 === properties.indexOf(name)) //do not redefine
                    properties.push(name);
            }
        },

        _saveState: function() {
            var properties = this.get('_properties');
            var backup = this.get('_backup');
            for(var i = 0; i < properties.length; i++) {
                backup[properties[i]] = this.get('_data.' + properties[i]);
            }
            this.set('_dirtyAttributes', []);
            return this;
        },

        _discardChanges: function() {
            var backup = this.get('_backup');
            this.setProperties(backup);
            this.set('_data', Ember.Object.create(backup));
            this.set('_dirtyAttributes', []);
            return this;
        },

        _markDirty: function(field) {
            var dirtyAttributes = this.get('_dirtyAttributes');
            if(-1 === dirtyAttributes.indexOf(field)) {
                dirtyAttributes.push(field);
            }
        },

        init: function() {
            this._super();
            this._saveState();
        },

        discard: function () {
            return this._discardChanges();
        },

        isDirty: function(attr) {
            var dirtyAttributes = this.get('_dirtyAttributes');
            if(attr !== undefined) {
                return !Ember.isEmpty(dirtyAttributes) && (dirtyAttributesindexOf(attr) != -1);
            } else {
                var dirty = false;
                var relationships = this.get('_relationships');
                for(var relname in relationships) {
                    if(relationships.hasOwnProperty(relname)) {
                        var rel = relationships[relname];
                        if(rel.get('type') == 'hasOne' || rel.get('type') == 'belongsTo') {
                            dirty |= rel.get('content').isDirty();
                        } else if(rel.get('type') == 'hasMany') {
                            dirty |= rel.get('content').reduce(function(previousValue, item) {
                                return previousValue |= item.isDirty();
                            }, false);
                        }
                    }
                }
                return dirty || !Ember.isEmpty(dirtyAttributes);
            }
        },

        commit: function() {
            return this._saveState();
        },

        toJSON: function() {
            return JSON.stringify(this.getProperties(this.get('_properties')));
        },

        load: function(data) {
            this.setProperties(data)
            this.commit();
            return this;
        },

        save: function() {
            return this.constructor.adapter.createRecord(this.constructor, this);
        },

        update: function() {
            return this.constructor.adapter.updateRecord(this.constructor, this);
        },

        remove: function() {
            return this.constructor.adapter.deleteRecord(this.constructor, this);
        },

        reload: function() {
            return this.constructor.adapter.reloadRecord(this.constructor, this);
        }
    });

    Frzn.Model.reopenClass({
        getName: function() {
            var name = this+"";
            if(name.lastIndexOf(".") != -1) {
                name = name.substr(name.lastIndexOf(".")+1);
            }
            return name.toLowerCase();
        },

        find: function (id) {
            var record = this.create()
            return this.adapter.find(this, record, id);
        },

        findAll: function () {
            var records = Frzn.RecordArray.create({
                type: this
            });
            return this.adapter.findAll(this, records);
        },

        findQuery: function (params) {
            var records = Frzn.RecordArray.create({
                type: this
            });
            return this.adapter.findQuery(this, records, params);
        },

        findIds: function () {
            var records = Frzn.RecordArray.create({
                type: this
            });
            var ids = Array.prototype.slice.apply(arguments);
            return this.adapter.findIds(this, records, ids);
        }
    });

    window.Frzn = Frzn;
})();
