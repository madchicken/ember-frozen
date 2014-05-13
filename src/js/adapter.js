!function() {
    var AbstractAdapter = Ember.Object.extend({
        extractMeta: Ember.K,

        discardOnFail: true,

        store: null,

        init: function() {
            this._super();
            this.store = Frzn.Store.create({});
        },

        getFromStore: function(record) {
            return this.store.getRecord(record);
        },

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
            var stored = this.store.putRecord(record);
            record.trigger('didLoad', stored);
            record.resolve(stored);
        },

        /**
         * After load hook
         * @param data
         * @param records
         * @private
         */
        _didLoadMany: function(data, records) {
            var objects = records.type.rootCollectionProperty ? data[records.type.rootCollectionProperty] : data;
            records.load(objects);
            if(this.extractMeta && typeof this.extractMeta === 'function') {
                this.extractMeta(data, records);
            }
            var adapter = this;
            records.forEach(function(record) {
                record.resolve(adapter.store.putRecord(record));
            });
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
            var stored = this.store.putRecord(record);
            record.trigger('didSave', stored);
            record.resolve(stored);
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
            var stored = this.store.putRecord(record);
            record.trigger('didSave', stored);
            record.resolve(this.store.putRecord(stored));
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
            this.store.removeRecord(record);
            record.trigger('didDelete', record);
            record.resolve(record);
        },

        /**
         * After update fail hook
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
        },

        resetPromise: function() {
            this.set('_deferred', Ember.RSVP.defer());
            return this;
        }
    });

    var InMemoryAdapter = AbstractAdapter.extend(Ember.SortableMixin, {
        database: null,

        init: function() {
            if(!this.database) {
                this.database = Em.A();
            }
            return this._super();
        },

        extractMeta: function(data, records) {
            records.set('meta', {
                offset: this.get('offset'),
                limit: this.get('limit'),
                total: this.database.length
            });
        },

        find: function(modelClass, record, id) {
            var data = this.database.findBy(modelClass.idProperty, id);
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
            this.store.clearCache(name);
            this.set('limit', 100);
            this.set('offset', 0);
            var data = this.database;
            this._didLoadMany(data, records);
            return records;
        },

        findQuery: function(modelClass, records, params) {
            var data = this.database;
            this.set('limit', 100);
            if(Ember.get(params, 'limit'))
                this.set('limit', Ember.get(params, 'limit'));
            this.set('offset', 0);
            if(Ember.get(params, 'offset'))
                this.set('offset', Ember.get(params, 'offset'));
            for(var prop in params) {
                if(prop !== 'limit' && prop !== 'offset' && prop !== 'sortBy' && prop !== 'sortDir')
                    data = data.filterBy(prop, params[prop]);
            }
            var sortBy = Ember.get(params, 'sortBy');
            if(sortBy) {
                var ascending = Ember.get(params, 'sortDir') !== 'desc';
                data.sort(function(a, b){
                    if(Ember.get(a, sortBy) > Ember.get(b, sortBy)) {
                        return ascending ? 1 : -1;
                    }
                    if(Ember.get(a, sortBy) < Ember.get(b, sortBy)) {
                        return ascending ? -1 : 1;
                    }
                    if(Ember.get(a, sortBy) == Ember.get(b, sortBy)) {
                        return 0;
                    }
                });
            }
            data = data.slice(this.get('offset'), this.get('offset') + this.get('limit'));
            this._didLoadMany(data, records);
            return records;
        },

        findIds: function(modelClass, records, ids) {
            var data = Em.A([]);
            for(var index = 0; index < ids.length; index++) {
                var rec = this.database.findBy('id', ids[index]);
                data.push(rec);
            }
            this._didLoadMany(data, records);
            return records;
        },

        createRecord: function(modelClass, record) {
            record.set('id', this.database.length);
            this.database.push(record);
            this._didCreate(record.toPlainObject(), record);
        },

        reloadRecord: function(modelClass, record) {
            return this.find(modelClass, record, record.getId());
        },

        updateRecord: function(modelClass, record) {
            var data = this.database.findBy(modelClass.idProperty, record.getId());
            if(data) {
                this._didUpdate(record.toPlainObject(), record);
            } else {
                record.reject({
                    errorCode: 404,
                    type: 'error',
                    message: 'Object not found'
                });
            }
            return record;
        },

        deleteRecord: function(modelClass, record) {
            var data = this.database.findBy(modelClass.idProperty, record.getId());
            if(data) {
                this.database = this.database.without(data);
                this._didDelete(record.toPlainObject(), record)
            } else {
                record.reject({
                    errorCode: 404,
                    type: 'error',
                    message: 'Object not found'
                });
            }
            return record;
        }
    });

    InMemoryAdapter.reopenClass({
        createWithData: function(data) {
            return InMemoryAdapter.create({
                database: data
            });
        }
    });

    Frzn.AbstractAdapter = AbstractAdapter;
    Frzn.RecordArray = RecordArray;
    Frzn.InMemoryAdapter = InMemoryAdapter;
}();