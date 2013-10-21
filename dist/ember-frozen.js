"use strict";
!function () {
    var converters = {};

    var get = Ember.get, set = Ember.set;

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
        set(model, '_relationships.' + name, rel);
        get(model, '_backup')[name] = rel;
        set(model, '_data.' + name, rel);
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
        if(get(model, '_backup').hasOwnProperty(name) === false) {
            options = options || {};
            if(options.isRelationship) {
                setupRelationship(model, name, options)
            } else {
                get(model, '_backup')[name] = options.defaultValue;
                set(model, '_data.' + name, options.defaultValue);
            }
            var properties = get(model, '_properties');
            if(-1 === properties.indexOf(name)) //do not redefine
                properties.push(name);
        }
    };
    
    var attr = function (type, options) {
        type = type || 'string';
        options = options || {};
        return function (key, value) {
            initField(this, key, options);
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
        }.property(),

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
}();

!function() {
    var AbstractAdapter = Ember.Object.extend({
        extractMeta: null,

        /**
         * After load hook
         * @param data
         * @param record
         * @private
         */
        _didLoad: function(data, record) {
            record.load(data);
            record.set('isLoaded', true);
            record.trigger('didLoad', record);
            record.resolve(record);
        },

        /**
         * After load hook
         * @param data
         * @param record
         * @private
         */
        _didLoadMany: function(data, records) {
            records.load(data);
            if(this.extractMeta && typeof this.extractMeta === 'function') {
                this.extractMeta(data, records);
            }
            records.resolve(records);
        },

        /**
         * After create hook
         * @param data
         * @param record
         * @private
         */
        _didCreate: function(data, record) {
            record.load(data);
            record.set('isSaved', true);
            record.set('isLoaded', true);
            record.trigger('didSave', record);
            record.resolve(record);
        },

        /**
         * After update hook
         * @param data
         * @param record
         * @private
         */
        _didUpdate: function(data, record) {
            record.load(data);
            record.set('isSaved', true);
            record.set('isLoaded', true);
            record.trigger('didSave', record);
            record.resolve(record);
        },

        /**
         * After delete hook
         * @param data
         * @param record
         * @private
         */
        _didDelete: function(data, record) {
            record.set('isDeleted', true);
            record.trigger('didDelete', record);
            record.resolve(record);
        },

        /**
         * Find an instance of the record given a specified id
         * @param modelClass {object} - the class type of the record
         * @param record {Frzn.Model} - an instance of the record that will be used to fulfill the request
         * @param id {object} - the id of the object to find
         * @return {object} - a model instance, that is promise too
         */
        find: function(modelClass, record, id) {
            Ember.assert("You must provide a valid find function for your adapter", false);
        },

        /**
         * Find all objects of a given type
         * @param modelClass {object} - the class type of the record
         * @param records {Frzn.RecordArray} - the provided record array that will be used to fulfill the request
         * @return {object} - a model instance, that is promise too
         */
        findAll: function(modelClass, records) {
            Ember.assert("You must provide a valid findAll function for your adapter", false);
        },

        findQuery: function() {
            Ember.assert("You must provide a valid findQuery function for your adapter", false);
        },

        findIds: function() {
            Ember.assert("You must provide a valid findIds function for your adapter", false);
        },

        createRecord: function() {
            Ember.assert("You must provide a valid createRecord function for your adapter", false);
        },

        updateRecord: function() {
            Ember.assert("You must provide a valid updateRecord function for your adapter", false);
        },

        reloadRecord: function() {
            Ember.assert("You must provide a valid reloadRecord function for your adapter", false);
        },

        deleteRecord: function() {
            Ember.assert("You must provide a valid delete function for your adapter", false);
        },
        rootProperty: null,
        totalProperty: null,
        pageProperty: null
    });

    var RecordArray = Ember.ArrayProxy.extend(Ember.DeferredMixin, {
        init: function() {
            this._super();
            this.set('meta', Em.Object.create({}));
            Ember.assert("You must specify a type for a record array", this.type != undefined);
        },

        load: function(data) {
            this.set('content', Em.A([]));
            if(data instanceof Array) {
                for(var i = 0; i < data.length; i++) {
                    var o = this.type.create(data[i]);
                    o.set('isLoaded', true);
                    this.pushObject(o);
                }
            }
            return this;
        }
    });

    var InMemoryAdapter = AbstractAdapter.extend({
        store: null,

        find: function(modelClass, record, id) {
            var name = modelClass.getName();
            var data = this.store[name].findBy('id', id);
            if(data) {
                this._didLoad(data, record);
            } else {
                record.reject({
                    errorCode: 404,
                    type: 'error',
                    message: 'Object not found'
                });
            }
            return record;
        },

        findAll: function(modelClass, records) {
            var name = modelClass.getName();
            if(this.store[name]) {
                var data = this.store[name];
                this._didLoadMany(data, records);
            } else {
                records.reject({
                    errorCode: 404,
                    type: 'error',
                    message: 'Object not found'
                });
            }
            return records;
        },

        findQuery: function(modelClass, records, params) {
            var name = modelClass.getName();
            if(this.store[name]) {
                var data = this.store[name];
                for(var prop in params) {
                    data = data.filterBy(prop, params[prop]);
                }
                this._didLoadMany(data, records);
            } else {
                records.reject({
                    errorCode: 404,
                    type: 'error',
                    message: 'Object not found'
                });
            }
            return records;
        },

        findIds: function(modelClass, records, ids) {
            var name = modelClass.getName();
            if(this.store[name]) {
                var data = Em.A([]);
                for(var index = 0; index < ids.length; index++) {
                    var rec = this.store[name].findBy('id', ids[index]);
                    data.push(rec);
                }
                this._didLoadMany(data, records);
            } else {
                records.reject({
                    errorCode: 404,
                    type: 'error',
                    message: 'Object not found'
                });
            }
            return records;
        },

        createRecord: function(modelClass, record) {
            var name = modelClass.getName();
            if(this.store[name]) {
                record.set('id', this.store[name].length);
                this.store[name].push(record);
                this._didCreate(record.toJSON(), record);
            }
            return record;
        },

        updateRecord: function() {
            Ember.assert("You must provide a valid updateRecord function for your adapter", false);
        },

        deleteRecord: function() {
            Ember.assert("You must provide a valid delete function for your adapter", false);
        },

        rootProperty: null,
        totalProperty: null,
        pageProperty: null
    });

    InMemoryAdapter.reopenClass({
        createWithData: function(data) {
            return InMemoryAdapter.create({
                store: data
            });
        }
    })

    Frzn.AbstractAdapter = AbstractAdapter;
    Frzn.RecordArray = RecordArray;
    Frzn.InMemoryAdapter = InMemoryAdapter;
}();
!function() {
    var UrlMappingAdapter = Frzn.AbstractAdapter.extend({
        rootPath: '',

        /**
         * An object containing all mappings for defined actions.
         *
         * Can be something like this:
         *
         ```javascript
         urlMapping: {
            find: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'GET'
            },
            findAll: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'GET'
            },
            findQuery: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'GET'
            },
            findIds: {
                url: ':resourceURI/?ids=:ids',
                dataType: 'json',
                type: 'GET'
            },
            createRecord: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'POST'
            },
            updateRecord: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'PUT'
            },
            deleteRecord: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'DELETE'
            }
         }
         ```
         * @property urlMapping
         * @type Object
         */
        urlMapping: null,

        init: function() {
            this._super();
            Ember.assert("You must provide a valid url map table", this.urlMapping !== null && this.urlMapping !== undefined);
        },

        /**
         * Retrieve the url information for a given action.
         * This method look in the urlMapping table to find configuration for the requested action.
         * It performs substitutions in the given string using passed parameters.
         * @param action - the action you want the url for
         * @param modelClass - the actual model class
         * @param params {object=} [params] - Parameters used in url substitution
         * @returns {string}
         */
        setupAjax: function(action, modelClass, params) {
            var d = this.urlMapping[action];
            d = d || {url: ':resourceURI/', type: 'GET'};
            d = Ember.copy(d, true);
            d.url = d.url.replace(':resourceURI', modelClass.url || modelClass.getName());
            if(params) {
                for(var name in params) {
                    if(params.hasOwnProperty(name)) {
                        d.url = d.url.replace(':'+name, params[name]);
                    }
                }
            }
            if(this.rootPath)
                d.url = this.rootPath + url;
            return d;
        },

        /**
         * @inheritDoc
         */
        find: function(modelClass, record, id) {
            var config = this.setupAjax('find', modelClass, {id: id});
            var adapter = this;
            $.ajax(Ember.merge(config, {
                beforeSend: function() {
                    record.set('isAjax', true);
                },

                complete: function() {
                    record.set('isAjax', false);
                },

                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    this._didLoad(obj, record);
                },

                error: function(response, type, title) {
                    record.set('isLoaded', false);
                    record.reject(response, type, title);
                }
            })
            );
            return record;
        },

        findAll: function(modelClass, records) {
            var config = this.setupAjax('findAll', modelClass);
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    this._didLoadMany(obj, records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        findQuery: function(modelClass, records, params) {
            var config = this.setupAjax('findQuery', modelClass, params);
            $.ajax(Ember.merge(config, {
                data: params,
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    records.load(obj);
                    records.resolve(records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        findIds: function(modelClass, records, ids) {
            var config = this.setupAjax('findIds', modelClass, {ids: ids});
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    records.load(obj);
                    records.resolve(records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        createRecord: function(modelClass, record) {
            var config = this.setupAjax('createRecord', modelClass);
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    this._didCreate(obj, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        updateRecord: function(modelClass, record) {
            var config = this.setupAjax('updateRecord', modelClass);
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    this._didUpdate(data, record);
                },

                error: function(response, type, title) {
                    record.discard();
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        deleteRecord: function(modelClass, record) {
            var config = this.setupAjax('deleteRecord', modelClass);
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    this._didDelete(obj, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        reloadRecord: function(modelClass, record) {
            var config = this.setupAjax('find', modelClass, {id: record.get('id')});
            record.set('_deferred', Ember.RSVP.defer());
            $.ajax(Ember.merge(config, {
                beforeSend: function() {
                    record.set('isAjax', true);
                },

                complete: function() {
                    record.set('isAjax', false);
                },

                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    record.load(obj);
                    record.set('isLoaded', true);
                    record.trigger('didLoad', record);
                    record.resolve(record);
                },

                error: function(response, type, title) {
                    record.set('isLoaded', false);
                    record.reject(response, type, title);
                }
            }));
            return record;
        }
    });

    Frzn.UrlMappingAdapter = UrlMappingAdapter;
}();
!function() {
    var RESTAdapter = Frzn.UrlMappingAdapter.extend({
        urlMapping: {
            find: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'GET'
            },
            findAll: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'GET'
            },
            findQuery: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'GET'
            },
            findIds: {
                url: ':resourceURI/?ids=:ids',
                dataType: 'json',
                type: 'GET'
            },
            createRecord: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'POST'
            },
            updateRecord: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'PUT'
            },
            deleteRecord: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'DELETE'
            }
        }
    });

    Frzn.RESTAdapter = RESTAdapter;
}();