"use strict"
!function(){
    window.Frzn = Ember.Object.extend({
        version: '0.8.2'
    });
}();
"use strict"
!function() {
    var converters = {};
    var get = Ember.get, set = Ember.set;

    var getConverter = function(name) {
        return converters[name] || SimpleConverter.create({name: name});
    };

    var registerConverter = function(name, converter) {
        converters[name] = converter.create();
    };

    var SimpleConverter = Ember.Object.extend({
        init: function() {
            Ember.warn("Using Simple converter for " + this.get('name'), true);
        },

        convert: function(value) {
            if(value)
                return value.valueOf();
            return value;
        }
    })

    registerConverter('model', Ember.Object.extend({
        convert: function(value, options) {
            if(value instanceof options.destination)
                return value;
            else {
                if(value && typeof value === 'object') {
                    //try to build a new destination object
                    return options.destination.create(value);
                }
            }
            return null;
        }
    }));

    registerConverter('modelArray', Ember.Object.extend({
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
    }));

    registerConverter('string', SimpleConverter.extend({
        convert: function(value) {
            if(!Ember.isEmpty(value))
                return (new String(value)).valueOf();
            else
                return value;
        }
    }));

    registerConverter('boolean', SimpleConverter.extend({
        convert: function(value) {
            return !!value;
        }
    }));

    registerConverter('object', SimpleConverter.extend({
        convert: function(value) {
            return value;
        }
    }));

    registerConverter('number', SimpleConverter.extend({
        convert: function(value) {
            if(value !== null && value !== undefined) {
                var num = new Number(value);
                return num.valueOf();
            }
            return value;
        }
    }));

    registerConverter('date', SimpleConverter.extend({
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

    Frzn.reopenClass({

        registerConverter: registerConverter,

        getConverter: getConverter

    })
}();
"use strict";
!function() {
    var get = Ember.get, set = Ember.set, getConverter = Frzn.getConverter;

    var Relationship = Em.Mixin.create({
        getObjectClass: function() {
            return this.get('options.destination');
        },

        toPlainObject: function(){
            var content = this.get('content');
            if(content) {
                return content.toPlainObject();
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
        },

        resolve: function() {
            var content = this.get('content');
            if(content) {
                content.resolve(content);
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

        toPlainObject: function() {
            var content = this.get('content');
            var data = [];
            if(content) {
                content.forEach(function(o) {
                    data.push(o.toPlainObject());
                });
            }
            return data;
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
        },

        resolve: function() {
            var content = this.get('content');
            if(content) {
                content.forEach(function(o) {
                    o.resolve(o);
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

    Frzn.reopenClass({
        relationships: relationships,

        hasMany: function (destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : true;
            Frzn.registerConverter("hasMany"+destination, getConverter('modelArray').constructor.extend({}));
            return Frzn.attr("hasMany"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'hasMany', destination: destination}))
        },

        hasOne: function(destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : true;
            Frzn.registerConverter("hasOne"+destination, getConverter('model').constructor.extend({}));
            return Frzn.attr("hasOne"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'hasOne', destination: destination}))
        },

        belongsTo: function(destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : false;
            var ModelConverter = getConverter('model');
            Frzn.registerConverter("belongsTo"+destination, getConverter('model').constructor.extend({}));
            return Frzn.attr("belongsTo"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'belongsTo', destination: destination}))
        }
    })
}();
"use strict";
!function () {
    var get = Ember.get, set = Ember.set, getConverter = Frzn.getConverter, relationships = Frzn.relationships;

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
    };

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
            return get(rel, 'content');
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
            //set the parent object in the content
            if(value) {
                set(value, '_parent', model);
            }
            //update the value of the relationship
            set(rel, 'content', value);
            rel.resolve()
        } else {
            //update the value of the field
            set(data, key, value);
        }
        //save the old value in the backup object if needed
        if(!get(backup, key))
            set(backup, key, oldValue);
        //mark dirty the field if necessary
        if(oldValue != value)
            markDirty(model, key);
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
        }.property('_data').meta({type: type, options: options});
    };

    window.Frzn.reopenClass({
        /**
         * Utility function to define a model attribute
         * @param type The type of attribute. Default to 'string'
         * @returns a computed property for the given attribute
         * @param options An hash describing the attribute. Accepted values are:
         *      defaultValue: a default value for the field when it is not defined (not valid for relationships)
         */
        attr: attr

    });


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


    var markDirty = function(model, field) {
        var dirtyAttributes = model.get('_dirtyAttributes');
        if(-1 === dirtyAttributes.indexOf(field)) {
            dirtyAttributes.push(field);
        }
        return model;
    };

    Frzn.Model = Ember.Deferred.extend(Ember.Evented, {
        isAjax: false,
        isLoaded: false,
        isSaved: false,
        isDeleted: false,
        url: null,
        errors: null,

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

        toPlainObject: function() {
            var properties = this.get('_properties');
            var rel = this.get('_relationships');
            var keep = [];
            var related = {};
            for(var i = 0; i < properties.length; i++) {
                var meta = this.constructor.metaForProperty(properties[i]);
                if(meta.options.isRelationship) {
                    var rel = this.getRel(properties[i]);
                    related[properties[i]] = rel.toPlainObject();
                } else {
                    keep.push(properties[i]);
                }
            }
            var base = this.getProperties(keep);
            return Ember.merge(base, related);
        },

        toJSON: function() {
            return JSON.stringify(this.toPlainObject());
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
        },

        fetch: function() {
            return this.reload();
        },

        resetPromise: function() {
            this.set('_deferred', Ember.RSVP.defer());
            return this;
        }
    });

    Frzn.Model.reopenClass({
        idProperty: 'id',

        rootProperty: null,

        rootCollectionProperty: null,

        create: function() {
            var C = this;
            this._initProperties([{
                _backup: {},
                _data: {},
                _dirtyAttributes: [],
                _properties: [],
                _relationships: {},
                _validators: {}
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

"use strict";
!function(){

    var NullableValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} cannot be null',
        validate: function(value) {
            if(this.get('value') === true)
                return true;
            return value !== null && value !== undefined;
        }
    });

    var BlankValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} cannot be empty',
        validate: function(value) {
            if(this.get('value') === true)
                return true;
            return value !== '';
        }
    });

    var EmailValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} is not a valid email',
        regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}/,

        init: function() {
            this.get('regex').compile();
            this._super();
        },

        validate: function(value) {
            return this.get('regex').test(value);
        }
    });

    var MinValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} must be greater or equals to {{value}}',
        validate: function(value) {
            return value >= this.get('minValue');
        }
    });

    var MaxValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} must be lesser or equals to {{value}}',
        validate: function(value) {
            return value <= this.get('maxValue');
        }
    });

    var validators = {
        nullable: NullableValidator,
        blank: BlankValidator,
        min: MinValidator,
        max: MaxValidator,
        email: EmailValidator
    };

    Frzn.reopenClass({
        validators: validators,

        addValidator: function(name, clazz){
            validators[name] = clazz;
        },

        getValidator: function(name, config) {
            if(validators[name]) {
                if(typeof config !== 'object') {
                    config = {value: config};
                }
                return validators[name].create(config);
            }
            return null;
        }
    });

    var initValidators = function(model, name, options) {
        if(options && !$.isEmptyObject(options)) {
            var validators = get(model, '_validators');
            var a = []
            for(var k in options) {
                if(options.hasOwnProperty(k)) {
                    var v = Frzn.getValidator(k, options[k]);
                    if(v) {
                        a.push(v);
                    }
                }
            }
            validators[name] = a;
        }
    };

    Frzn.Model.reopen({
        validate: function() {
            var validators = get(this, '_validators');
            var errors = [];
            if(!$.isEmptyObject(validators)) {
                for(var k in validators) {
                    if(validators.hasOwnProperty(k)) {
                        var a = validators[k];
                        for(var i = 0; i < k.length; k++) {
                            if(!k[i].validate()) {
                                errors.push(k);
                            }
                        }
                    }
                }
            }
            set(this, 'errors', errors);
            return errors.length > 0;
        },

        initValidators: function(field, options) {
            return initValidators(this, field, options);
        }
    });
}();
!function() {
    var AbstractAdapter = Ember.Object.extend({
        extractMeta: null,

        discardOnFail: true,

        extractData: function(data, record) {
            return record.constructor.rootProperty ? data[record.constructor.rootProperty] : data;
        },

        /**
         * After load hook
         * @param data
         * @param record
         * @private
         */
        _didLoad: function(data, record) {
            var json = this.extractData(data, record);
            record.load(json);
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
            var objs = records.type.rootCollectionProperty ? data[records.type.rootCollectionProperty] : data;
            records.load(objs);
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
            var json = this.extractData(data, record);
            record.load(json);
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
            var json = this.extractData(data, record);
            record.load(json);
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
            var json = this.extractData(data, record);
            record.load(json);
            record.set('isDeleted', true);
            record.trigger('didDelete', record);
            record.resolve(record);
        },

        /**
         * After update fail hook
         * @param data
         * @param record
         * @private
         */
        _didFailUpdate: function(record) {
            if(this.discardOnFail) {
                record.discard();
            }
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
        }
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

        initCollection: function(name) {
            if(!this.store[name]) {
                this.store[name] = Em.A();
            }
            return this;
        },

        find: function(modelClass, record, id) {
            var name = modelClass.getName();
            this.initCollection(name);
            var data = this.store[name].findBy(modelClass.idProperty, id);
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
            this.initCollection(name);
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
            this.initCollection(name);
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
            this.initCollection(name);
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
            this.initCollection(name);
            if(this.store[name]) {
                record.set('id', this.store[name].length);
                this.store[name].push(record);
                this._didCreate(record.toJSON(), record);
            }
            return record;
        },

        reloadRecord: function(modelClass, record) {

        },

        updateRecord: function(modelClass, record) {
            Ember.assert("You must provide a valid updateRecord function for your adapter", false);
        },

        deleteRecord: function(modelClass, record) {
            Ember.assert("You must provide a valid delete function for your adapter", false);
        }
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
        urlMapping: {},

        concatenatedProperties: ['urlMapping'],

        init: function() {
            this._super();
            $.ajaxSetup({
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json'
            });
            Ember.assert("You must provide a valid url map table", this.get('urlMapping') !== null && this.get('urlMapping') !== undefined && !$.isEmptyObject(this.get('urlMapping')));
            Ember.assert("Url map table must be a valid hash object", !$.isEmptyObject(this.get('urlMapping')));
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
        setupAjax: function(action, model, params) {
            params = params || {};
            var modelClass = model.constructor;
            model.resetPromise();
            if(model instanceof Frzn.RecordArray) {
                modelClass = model.type;
            }

            var mapping = this.get('urlMapping').reduce(function(o, p) {return Ember.merge(p, o)});
            var actionData = mapping[action];
            Ember.warn("No configuration found for action " + action, actionData !== undefined);
            actionData = actionData || {url: ':resourceURI/', type: 'GET', dataType: 'json'};
            actionData = Ember.copy(actionData, true);
            var url = typeof modelClass.url === 'function' ? modelClass.url() : modelClass.url;
            if(!url) {
                url = modelClass.getName();
                url = url.substr(0, 1).toLowerCase() + url.substr(1);
            }
            actionData.url = actionData.url.replace(':resourceURI', url);

            var tokens = actionData.url.match(/:([a-zA-z_-]+)/g);
            if(tokens && tokens.length) {
                for(var i = 0; i < tokens.length; i++) {
                    var k = tokens[i];
                    var p = k.substr(1); //get rid of the : character
                    var v = params[p] || model.get(p);
                    actionData.url = actionData.url.replace(k, v);
                }
            }
            if(this.rootPath)
                actionData.url = this.rootPath + actionData.url;

            return actionData;
        },

        /**
         * @inheritDoc
         */
        find: function(modelClass, record, id) {
            var config = this.setupAjax('find', record, {id: id});
            var adapter = this;
            $.ajax(Ember.merge(config, {
                beforeSend: function() {
                    record.set('isAjax', true);
                },

                complete: function() {
                    record.set('isAjax', false);
                },

                success: function(data) {
                    adapter._didLoad(data, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            })
            );
            return record;
        },

        findAll: function(modelClass, records) {
            var config = this.setupAjax('findAll', records);
            var adapter = this;
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    adapter._didLoadMany(data, records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        findQuery: function(modelClass, records, params) {
            var config = this.setupAjax('findQuery', records, params);
            var adapter = this;
            $.ajax(Ember.merge(config, {
                data: params,
                success: function(data) {
                    adapter._didLoadMany(data, records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        findIds: function(modelClass, records, ids) {
            var config = this.setupAjax('findIds', records, {ids: ids});
            var adapter = this;
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    adapter._didLoadMany(data, records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        createRecord: function(modelClass, record) {
            var config = this.setupAjax('createRecord', record, record.toJSON());
            var adapter = this;
            $.ajax(Ember.merge(config, {
                data: record.toJSON(),
                beforeSend: function() {
                    record.set('isAjax', true);
                },

                complete: function() {
                    record.set('isAjax', false);
                },

                success: function(data) {
                    adapter._didCreate(data, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        updateRecord: function(modelClass, record) {
            var config = this.setupAjax('updateRecord', record, record.toJSON());
            var adapter = this;
            $.ajax(Ember.merge(config, {
                data: record.toJSON(),
                beforeSend: function() {
                    record.set('isAjax', true);
                },

                complete: function() {
                    record.set('isAjax', false);
                },

                success: function(data) {
                    adapter._didUpdate(data, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        deleteRecord: function(modelClass, record) {
            var config = this.setupAjax('deleteRecord', record);
            var adapter = this;
            $.ajax(Ember.merge(config, {
                beforeSend: function() {
                    record.set('isAjax', true);
                },

                complete: function() {
                    record.set('isAjax', false);
                },

                success: function(data) {
                    adapter._didDelete(data, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        reloadRecord: function(modelClass, record) {
            var config = this.setupAjax('find', record, {id: record.get('id')});
            var adapter = this;
            $.ajax(Ember.merge(config, {
                beforeSend: function() {
                    record.set('isAjax', true);
                },

                complete: function() {
                    record.set('isAjax', false);
                },

                success: function(data) {
                    adapter._didLoad(data, record);
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
                type: 'PUT'
            },
            updateRecord: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'POST'
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