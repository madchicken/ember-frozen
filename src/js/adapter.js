Frzn.AbstractAdapter = Ember.Object.extend({
    extractMeta: null,

    find: function() {
        Ember.assert("You must provide a valid find function for your adapter", false);
    },
    findAll: function() {
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
    deleteRecord: function() {
        Ember.assert("You must provide a valid delete function for your adapter", false);
    },
    rootProperty: null,
    totalProperty: null,
    pageProperty: null
});

Frzn.RecordArray = Ember.ArrayProxy.extend(Ember.DeferredMixin, {
    init: function() {
        this._super();
        this.set('meta', Em.Object.create({}));
    },

    load: function(data) {
        this.set('content', Em.A([]));
        if(data instanceof Array) {
            for(var i = 0; i < data.length; i++) {
                this.pushObject(this.type.create(data[i]));
            }
        }
        if(this.type.adapter.extractMeta && typeof this.type.adapter.extractMeta === 'function') {
            this.type.adapter.extractMeta(data, this);
        }
    }
});

Frzn.InMemoryAdapter = Frzn.AbstractAdapter.extend({
    store: null,

    find: function(modelClass, record, id) {
        var name = modelClass.getName();
        var data = this.store[name].findBy('id', id);
        if(data) {
            record.load(data);
            record.resolve(record);
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
            records.load(data);
            records.resolve(records);
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
            records.load(data);
            records.resolve(records);
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
            records.load(data);
            records.resolve(records);
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
            this.store[name].push(record);
            record.set('id', this.store[name].length);
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

Frzn.InMemoryAdapter.reopenClass({
    createWithData: function(data) {
        return Frzn.InMemoryAdapter.create({
            store: data
        });
    }
})

Frzn.UrlMappingAdapter = Frzn.AbstractAdapter.extend({
    rootPath: '',

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
        }
    },

    /**
     * Retrieve the url for a givn action. It performs substitutions in the given string using passed parameters.
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
                record.load(obj);
                record.set('isLoaded', true);
                record.trigger('didLoad', record);
                record.resolve(record);
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
                records.load(obj);
                records.resolve(records);
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
                record.load(obj);
                record.set('isSaved', true);
                record.set('isLoaded', true);
                record.trigger('didSave', record);
                record.resolve(record);
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
                record.load(obj);
                record.set('isSaved', true);
                record.set('isLoaded', true);
                record.trigger('didSave', record);
                record.resolve(record);
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
                record.set('isDeleted', true);
                record.trigger('didDelete', record);
                record.resolve(record);
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