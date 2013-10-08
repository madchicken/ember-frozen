"use strict";
(function () {

    var converters = {};
    var Frzn = {
        version: "1.0",
        /**
         * Utility function to define a model attribute
         * @param type The type of attribute. Default to 'string'
         * @returns a computed property for the given attribute
         */
        attr: function (type, options) {
            type = type || 'string';
            options = options || {};
            return function (key, value) {
                this._initField(key, options);
                var converter = Frzn.getConverter(type);
                if(options.isRelationship) {
                    key += '.content'; //use wrapped content in Ember proxy object
                }
                if (arguments.length > 1) {
                    var oldValue = this.get('_data.'+key);
                    value = converter.convert(value, options);
                    this.set('_data.'+key, value);
                    if(oldValue != value)
                        this._markDirty(key);
                }
                value = this.get('_data.'+key);
                return value;
            }.property().meta({type: type, options: options});
        },

        hasMany: function (destination, options) {
            return new HasManyRelationship({
                _destination: destination,
                _options: options
            });
        },

        hasOne: function(destination, options) {
            options = options || {};
            Frzn.registerConverter(destination, ModelConverter.extend({}));
            return Frzn.attr(destination, Ember.merge(options, {isRelationship: true, relationshipType: 'hasOne', destination: destination}))
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
                    if(Number.isNaN(d.getTime()))
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

    var HasManyRelationship = Ember.ArrayProxy.extend({
        _destination: null,
        concatenatedProperties: ['options'],
        _mappedBy: null,

        init: function () {
            this.options = Ember.Object.create({
                embedded: false
            });
        },

        mappedBy: function () {
            if (this.get('_options.mappedBy')) {
                return this.get('_options.mappedBy');
            } else {
                var name = this.constructor + "";
                name = name.substr(name.lastIndexOf("."));
                return name.toLowerCase();
            }
        }.property('_options.mappedBy').cacheable()
    });

    var HasOneRelationship = Ember.ObjectProxy.extend({
        _destination: null,
        concatenatedProperties: ['options'],
        _mappedBy: null,

        init: function () {
            this._options = Ember.Object.create({
                embedded: false
            });
        },

        mappedBy: function () {
            if (this.get('_options.mappedBy')) {
                return this.get('_options.mappedBy');
            } else {
                var name = this.constructor + "";
                name = name.substr(name.lastIndexOf("."));
                return name.toLowerCase();
            }
        }.property('_options.mappedBy').cacheable()
    });

    var relationships = {
        hasOne: HasOneRelationship,
        hasMany: HasManyRelationship
    }

    Frzn.Model = Ember.Object.extend(Ember.DeferredMixin, Ember.Evented, {
        isAjax: false,
        isLoaded: false,
        isSaved: false,
        isDeleted: false,
        isError: false,
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
            if(!this.get('_backup')[name]) {
                Ember.assert("Field name must not be null", name !== null && name !== undefined && name != "");
                options = options || {};
                if(options.isRelationship) {
                    //For relationships we create a wrapper object using Ember proxies
                    var rel = relationships[options.relationshipType].create({
                        _destination: options.destination
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
            }
            return !Ember.isEmpty(dirtyAttributes);
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
        }
    });

    Frzn.Model.reopenClass({
        fromJson: function (data) {
            return this.create(data);
        },

        createItemRecords: function (recs) {
            var ModelClass = this;
            return recs.map(function (item) {
                return ModelClass.fromJson(item);
            });
        },

        urlForAction: function (action) {
            var u = this.resourceUrl;
            if (u.lastIndexOf('/') != u.length - 1) {
                u += "/";
            }
            return baseUrl + u + (this.actions[action] || action);
        },

        find: function (id) {
            this.adapter.find(id);
        },

        findAll: function (data) {
        },

        findQuery: function (data) {
        }
    });

    window.Frzn = Frzn;
})();
