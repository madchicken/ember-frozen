(function () {
    'use strict';
    var get = Ember.get, set = Ember.set, getConverter = Frzn.getConverter, relationships = Frzn.relationships;

    var DeferredMixin = Ember.Mixin.create({
        /**
         Add handlers to be called when the Deferred object is resolved or rejected.
         @method then
         @param {Function} resolve a callback function to be called when done
         @param {Function} reject  a callback function to be called when failed
         */
        then: function (resolve, reject, label) {
            var deferred, promise, entity;

            entity = this;
            deferred = get(this, '_deferred');
            promise = deferred.promise;

            function fulfillmentHandler(fulfillment) {
                if (fulfillment === promise) {
                    return resolve(entity);
                } else {
                    return resolve(fulfillment);
                }
            }

            return promise.then(resolve && fulfillmentHandler, reject, label);
        },

        /**
         Resolve a Deferred object and call any `doneCallbacks` with the given args.
         @method resolve
         */
        resolve: function (value) {
            var deferred, promise;

            deferred = get(this, '_deferred');
            promise = deferred.promise;

            if (value === this) {
                deferred.resolve(promise);
            } else {
                deferred.resolve(value);
            }
        },

        /**
         Reject a Deferred object and call any `failCallbacks` with the given args.
         @method reject
         */
        reject: function (value) {
            get(this, '_deferred').reject(value);
        },

        _deferred: Ember.computed(function () {
            return Ember.RSVP.defer('Ember: DeferredMixin - ' + this);
        })
    });

    Frzn.DeferredMixin = DeferredMixin;

    var setupRelationship = function (model, name, options) {
        //For relationships we create a wrapper object using Ember proxies
        if (typeof options.destination === 'string') {
            var dst = get(options.destination);
            if (!dst) {
                var s = options.destination.split('.');
                if (s.length) {
                    dst = Ember.Namespace.byName(s[0]).get(s.slice(1).join('.'));
                }
            }
            options.destination = dst;
        }
        Ember.assert('You must provide a valid model class for field ' + name, options.destination !== null && options.destination !== undefined);
        var rel = relationships[options.relationshipType].create({
            type: options.relationshipType,
            options: options
        });
        var data = model._data;
        var rels = model._relationships;
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
    var initField = function (model, name, options) {
        Ember.assert('Field name must not be null', name !== null && name !== undefined && name !== '');
        if (get(model, '_data').hasOwnProperty(name) === false) {
            options = options || {};
            if (options.isRelationship) {
                setupRelationship(model, name, options);
            } else {
                set(model, '_data.' + name, options.defaultValue);
            }
            var properties = model._properties;
            if (-1 === properties.indexOf(name)) {//do not redefine
                properties.push(name);
            }
        }
    };

    var getValue = function (model, key) {
        var meta = model.constructor.metaForProperty(key);
        //prepare for reading value: get _data object
        var data = get(model, '_data');
        if (meta.options.isRelationship) {
            //we are dealing with a relationship, so get its definition first
            var rel = model._relationships[key];
            //the real value is the content of the relationship proxy object
            if (meta.options.embedded === false && meta.options.fetch === 'eager') {
                return rel.fetch();
            } else {
                return get(rel, 'content');
            }
        } else {
            //a plain field was requested, get the value from the _data object
            return Ember.getWithDefault(data, key, meta.options.defaultValue);
        }
    };

    var setValue = function (model, key, value) {
        var meta = model.constructor.metaForProperty(key);
        var converter = getConverter(meta.type);
        value = converter.convert(value, meta.options);
        //prepare object: get _data and _backup
        var data = model._data;
        var backup = model._backup;
        //the old value is the one already present in _data object
        var oldValue = get(data, key);
        if (meta.options.isRelationship) {
            //we are dealing with a relationship, so get its definition first
            var rel = model._relationships[key];
            //old value is the content of the relationship object
            oldValue = get(rel, 'content');
            //set the parent object in the content
            if (value) {
                set(value, '_parent', model);
            }
            //update the value of the relationship
            set(rel, 'content', value);
            rel.resolve();
        } else {
            //update the value of the field
            set(data, key, value);
        }
        //save the old value in the backup object if needed
        if (!backup[key]) {
            backup[key] = oldValue;
        }
        //mark dirty the field if necessary
        if (oldValue !== value) {
            markDirty(model, key);
        }
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


    var saveState = function (model) {
        var dirtyAttrs = get(model, '_dirtyAttributes');
        for (var i = 0; i < dirtyAttrs.length; i++) {
            var p = dirtyAttrs[i];
            if (model.constructor.metaForProperty(p).options.isRelationship) {
                model.getRel(p).commit();
            }
        }
        set(model, '_dirtyAttributes', []);
        set(model, '_backup', {});
        return model;
    };

    var discardChanges = function (model) {
        var backup = model.get('_backup');
        set(model, '_backup', {});
        var dirtyAttrs = get(model, '_dirtyAttributes');
        Ember.setProperties(model, Ember.getProperties(backup, dirtyAttrs));
        var relationships = model._relationships;
        for (var name in relationships) {
            if (relationships.hasOwnProperty(name)) {
                model.getRel(name).discard();
            }
        }
        model._dirtyAttributes = [];
        return model;
    };


    var markDirty = function (model, field) {
        var dirtyAttributes = model._dirtyAttributes;
        if (-1 === dirtyAttributes.indexOf(field)) {
            dirtyAttributes.push(field);
        }
        return model;
    };

    var guid = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    Frzn.Model = Ember.Object.extend(DeferredMixin, Ember.Evented, {
        isAjax: false,
        isLoaded: false,
        isSaved: false,
        isDeleted: false,
        url: null,
        errors: null,
        clientId: null,

        init: function () {
            this._super();
            this.clientId = guid();
            this._dirtyAttributes = [];
            this._backup = {};
        },

        getId: function () {
            return this.get(this.constructor.idProperty);
        },

        getClientId: function () {
            return this.clientId;
        },

        getRel: function (rel) {
            return this.get('_relationships.' + rel);
        },

        discard: function () {
            return discardChanges(this);
        },

        isDirty: function (attr) {
            var dirtyAttributes = this.get('_dirtyAttributes');
            if (attr !== undefined) {
                return !Ember.isEmpty(dirtyAttributes) && (dirtyAttributesindexOf(attr) !== -1);
            } else {
                var dirty = false;
                var callback = function (previousValue, item) {
                    return previousValue || item.isDirty();
                };
                for (var relName in this._relationships) {
                    if (this._relationships.hasOwnProperty(relName)) {
                        var rel = this._relationships[relName];
                        if (rel.get('type') === 'hasOne' || rel.get('type') === 'belongsTo') {
                            dirty = dirty || rel.get('content').isDirty();
                        } else if (rel.get('type') === 'hasMany') {
                            dirty = dirty || rel.get('content').reduce(callback, false);
                        }
                    }
                }
                return dirty || !Ember.isEmpty(dirtyAttributes);
            }
        },

        commit: function () {
            return saveState(this);
        },

        toPlainObject: function () {
            var properties = this._properties;
            var rel = this._relationships;
            var keep = [];
            var related = {};
            for (var i = 0; i < properties.length; i++) {
                var meta = this.constructor.metaForProperty(properties[i]);
                if (meta.options.isRelationship) {
                    rel = this.getRel(properties[i]);
                    related[properties[i]] = rel.toPlainObject();
                } else {
                    keep.push(properties[i]);
                }
            }
            var base = this.getProperties(keep);
            return Ember.merge(base, related);
        },

        toJSON: function () {
            return JSON.stringify(this.toPlainObject());
        },

        load: function (data) {
            this.setProperties(data);
            this.commit();
            return this;
        },

        save: function () {
            if (this.getId()) {
                return this.update();
            }
            this.resetPromise();
            return this.constructor.adapter.createRecord(this.constructor, this);
        },

        update: function () {
            this.resetPromise();
            return this.constructor.adapter.updateRecord(this.constructor, this);
        },

        remove: function () {
            this.resetPromise();
            return this.constructor.adapter.deleteRecord(this.constructor, this);
        },

        reload: function () {
            this.resetPromise();
            return this.constructor.adapter.reloadRecord(this.constructor, this);
        },

        fetch: function () {
            return this.reload();
        },

        resetPromise: function () {
            this.set('_deferred', Ember.RSVP.defer());
            return this;
        }
    });

    Frzn.Model.reopenClass({
        idProperty: 'id',

        rootProperty: null,

        rootCollectionProperty: null,

        create: function () {
            var C = this;
            var props = {
                _backup: {},
                _data: {},
                _dirtyAttributes: [],
                _properties: [],
                _relationships: {},
                _validators: {}
            };
            if (arguments.length > 0) {
                Ember.merge(props, arguments[0]);
            }
            this._initProperties([props]);
            var instance = new C();
            instance.resolve(instance);
            return instance;
        },

        _create: Ember.Object.create,

        getName: function () {
            var name = this + '';
            if (name && name.lastIndexOf('.') !== -1) {
                name = name.substr(name.lastIndexOf('.') + 1);
            }
            return name;
        },

        find: function (id) {
            Ember.assert('You must provide a valid id when searching for ' + this, (id !== undefined));
            var properties = {};
            properties[this.idProperty] = id;
            var record = this.create(properties);
            record = this.adapter.getFromStore(record) || record;
            record.resetPromise();
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
