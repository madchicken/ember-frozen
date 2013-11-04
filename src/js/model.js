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
