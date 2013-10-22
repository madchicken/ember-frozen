"use strict";
!function () {
    var converters = {};
    var get = Ember.get, set = Ember.set;

    var getConverter = function(name) {
        return converters[name] || SimpleConverter.create({});
    };

    var setupRelationship = function(model, name, options) {
        //For relationships we create a wrapper object using Ember proxies
        if(typeof options.destination == 'string') {
            var dst = get(options.destination);
            if(!dst) {
                var s = options.destination.split('.');
                if(s.length) {
                    dst = Ember.Namespace.byName(s[0]).get(s.slice(1).join('.'));
                }
            }
            options.destination = dst;
        }
        Ember.assert("You must provide a valid model class for field " + name, options.destination != null && options.destination != undefined);
        var rel = relationships[options.relationshipType].create({
            type: options.relationshipType,
            options: options
        });
        var data = get(model, '_data');
        var rels = get(model, '_relationships');
        set(rels, name, rel);
        set(data, name, undefined);
    }

    /**
     * Initialize a model field. This function tries to understand what kind of attribute should be
     * instantiated, along with converters and relationships.
     *
     * @param model {Frzn.Model} - the model the field applies to
     * @param name {string} - the field name
     * @param options {object=} - options describing the field
     */
    var initField = function(model, name, options) {
        Ember.assert("Field name must not be null", name !== null && name !== undefined && name != "");
        if(get(model, '_data').hasOwnProperty(name) === false) {
            options = options || {};
            if(options.isRelationship) {
                setupRelationship(model, name, options)
            } else {
                set(model, '_data.' + name, options.defaultValue);
            }
            var properties = get(model, '_properties');
            if(-1 === properties.indexOf(name)) //do not redefine
                properties.push(name);
        }
    };

    var getValue = function(model, key) {
        var meta = model.constructor.metaForProperty(key);
        //prepare for reading value: get _data object
        var data = get(model, '_data');
        if(meta.options.isRelationship) {
            //we are dealing with a relationship, so get its definition first
            var rel = get(model, '_relationships.' + key);
            //the real value is the content of the relationship proxy object
            var value = get(rel, 'content');
            if(!meta.options.embedded && value.get('isLoaded') !== true) {
                //this is a not embedded relationship, must fetch the object
                var dest = meta.options.destination.find(value.get(value.constructor.idProperty))
                dest.then(function(m) {
                    //update the content of the relationship
                    rel.set('content', m);
                });
                return dest;
            } else {
                return value;
            }
        } else {
            //a plain field was requested, get the value from the _data object
            return Ember.getWithDefault(data, key, meta.options.defaultValue);
        }
    };

    var setValue = function(model, key, value) {
        var meta = model.constructor.metaForProperty(key);
        var converter = getConverter(meta.type);
        value = converter.convert(value, meta.options);
        //prepare object: get _data and _backup
        var data = get(model, '_data');
        var backup = get(model, '_backup');
        //the old value is the one already present in _data object
        var oldValue = get(data, key);
        if(meta.options.isRelationship) {
            //we are dealing with a relationship, so get its definition first
            var rel = get(model, '_relationships.' + key);
            //old value is the content of the relationship object
            oldValue = get(rel, 'content');
            //update the value of the relationship
            set(rel, 'content', value);
        } else {
            //update the value of the field
            set(data, key, value);
        }
        //save the old value in the backup object if needed
        if(!get(backup, key))
            set(backup, key, oldValue);
        //mark dirty the field if necessary
        if(oldValue != value)
            model._markDirty(key);
        if(key == model.constructor.idProperty)
            model[key] = value;
        return value;
    };

    var attr = function (type, options) {
        type = type || 'string';
        options = options || {};
        return function (key, value) {
            initField(this, key, options);
            if (arguments.length > 1) {
                //setter
                value = setValue(this, key, value);
            } else {
                //getter
                value = getValue(this, key);
            }
            return value;
        }.property('_data').cacheable(false).meta({type: type, options: options}); //TODO: cacheable is false to allow more complex get operations. I should avoid this...
    };

    var Frzn = {
        version: "0.8.0",
        
        /**
         * Utility function to define a model attribute
         * @param type The type of attribute. Default to 'string'
         * @returns a computed property for the given attribute
         * @param options An hash describing the attribute. Accepted values are:
         *      defaultValue: a default value for the field when it is not defined (not valid for relationships)
         */
        attr: attr,

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
            options.embedded = options.embedded !== undefined ? options.embedded : false;
            Frzn.registerConverter("belongsTo"+destination, ModelConverter.extend({}));
            return Frzn.attr("belongsTo"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'belongsTo', destination: destination}))
        },

        registerConverter: function(name, converter) {
            converters[name] = converter.create();
        },

        getConverter: getConverter
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
        },

        toJSON: function(){
            var content = this.get('content');
            if(content) {
                return content.toJSON();
            }
            return null;
        },

        commit: function() {
            var content = this.get('content');
            if(content) {
                return content.commit();
            }
        },

        discard: function() {
            var content = this.get('content');
            if(content) {
                return content.discard();
            }
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
        },

        toJSON: function() {
            var content = this.get('content');
            var data = [];
            if(content) {
                content.forEach(function(o) {
                    data.push(o.toJSON());
                });
            }
            return JSON.stringify(data);
        },

        commit: function() {
            var content = this.get('content');
            if(content) {
                content.forEach(function(o) {
                    o.commit();
                });
            }
        },

        discard: function() {
            var content = this.get('content');
            if(content) {
                content.forEach(function(o) {
                    o.discard();
                });
            }
        }
    });

    var HasOneRelationship = Ember.ObjectProxy.extend(Relationship, {
    });

    var BelongsToRelationship = Ember.ObjectProxy.extend(Relationship, {
    });

    var relationships = {
        hasOne: HasOneRelationship,
        hasMany: HasManyRelationship,
        belongsTo: BelongsToRelationship
    };

    var saveState = function(model) {
        var dirtyAttrs = get(model, '_dirtyAttributes');
        var backup = model.get('_backup');
        for(var i = 0; i < dirtyAttrs.length; i++) {
            var p = dirtyAttrs[i];
            if(model.constructor.metaForProperty(p).options.isRelationship) {
               model.getRel(p).commit();
            }
        }
        set(model, '_dirtyAttributes', []);
        set(model, '_backup', {});
        return model;
    };

    var discardChanges = function(model) {
        var backup = model.get('_backup');
        set(model, '_backup', {});
        var dirtyAttrs = get(model, '_dirtyAttributes');
        Ember.setProperties(model, Ember.getProperties(backup, dirtyAttrs));
        var relationships = get(model, '_relationships');
        for(var name in relationships) {
            if(relationships.hasOwnProperty(name)) {
                model.getRel(name).discard();
            }
        }
        set(model, '_dirtyAttributes', []);
        return model;
    };

    Frzn.Model = Ember.Object.extend(Ember.DeferredMixin, Ember.Evented, {
        isAjax: false,
        isLoaded: false,
        isSaved: false,
        isDeleted: false,
        url: null,
        errors: null,

        _markDirty: function(field) {
            var dirtyAttributes = this.get('_dirtyAttributes');
            if(-1 === dirtyAttributes.indexOf(field)) {
                dirtyAttributes.push(field);
            }
        },

        init: function() {
            this._super();
            saveState(this);
        },

        getId: function() {
            return this.get(this.constructor.idProperty);
        },

        getRel: function(rel) {
            return this.get('_relationships.'+rel);
        },

        discard: function () {
            return discardChanges(this);
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
            return saveState(this);
        },

        toJSON: function() {
            var properties = this.get('_properties');
            var rel = this.get('_relationships');
            var keep = [];
            var related = {};
            for(var i = 0; i < properties.length; i++) {
                var meta = this.constructor.metaForProperty(properties[i]);
                if(meta.options.isRelationship) {
                    var rel = this.getRel(properties[i]);
                    related[properties[i]] = JSON.parse(rel.toJSON());
                } else {
                    keep.push(properties[i]);
                }
            }
            var base = this.getProperties(keep);
            return JSON.stringify(Ember.merge(base, related));
        },

        load: function(data) {
            this.setProperties(data)
            this.commit();
            return this;
        },

        save: function() {
            if(this.getId())
                return this.update();
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
        idProperty: 'id',

        create: function() {
            var C = this;
            this._initProperties([{
                _backup: {},
                _data: {},
                _dirtyAttributes: [],
                _properties: [],
                _relationships: {}
            }]);
            var instance = new C();
            if (arguments.length>0) {
                instance.setProperties(arguments[0]);
            }
            instance.commit();
            return instance
        },

        _create: Ember.Object.create,

        getName: function() {
            var name = this+"";
            if(name && name.lastIndexOf(".") != -1) {
                name = name.substr(name.lastIndexOf(".")+1);
            }
            return name;
        },

        find: function (id) {
            Ember.assert("You must provide a valid id when searching for " + this, !!id);
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
}();
