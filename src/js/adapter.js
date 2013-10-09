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
    urlMapping: {
        find: {
            url: ':resourceURI/:id',
            method: 'GET'
        },
        findAll: {
            url: ':resourceURI/list',
            method: 'GET'
        },
        findQuery: {
            url: ':resourceURI/list',
            method: 'GET'
        },
        createRecord: {
            url: ':resourceURI/',
            method: 'POST'
        },
        updateRecord: {
            url: ':resourceURI/:id',
            method: 'PUT'
        }
    },

    find: function(id) {
        var that = this;
        var model = this.create({});
        $.ajax({
            url: this.urlForAction('show') + "/" + id,
            dataType: 'json',
            type: "GET",

            beforeSend: function() {
                model.set('isAjax', true);
            },

            complete: function() {
                model.set('isAjax', false);
            },

            statusCode: {
                200: function (result) {
                    console.log("Loaded from server object of type %o: %o", that, result.data);
                    if(result.data) {
                        model.setProperties(that.fromJson(result.data));
                        model.set('_backup', that.create(model));
                        model.trigger('loaded');
                        model.resolve(model);
                    }
                },

                401: function() {
                    model.reject(response, type, title)
                },

                404: function(response, type, title) {
                    console.log(arguments);
                    model.set('isError', true);
                    model.trigger('error', response, type, title);
                    model.reject(response, type, title)
                },

                500: function(response, type, title) {
                    console.log(arguments);
                    model.set('isError', true);
                    model.trigger('error', response, type, title);
                    model.reject(response, type, title)
                }
            }
        });
        return model;
    },
    findAll: function() {
        data =  data || {
            max:10,
            offset:0,
            sort: "lastUpdated",
            order: "desc"
        };
        data =  Ember.Object.create(data);
        console.log("Loading list of %o using parameters %o", this, data);
        var sr = SR.create({});
        $.ajax({
            url: this.urlForAction('list'),
            data: data.getJson(),
            dataType: 'json',
            statusCode: {
                200: function (result) {
                    console.log("Loaded list of %o from server: %o", this, result);
                    if(result.records) {
                        var recs = result.records;
                        recs = this.createItemRecords(recs)
                        sr.set('content', recs);
                        sr.set('total', result.total);
                    }
                    sr.resolve(sr);
                }.bind(this),
                401: function() {
                },
                500: function(response, type, title) {
                    sr.reject(response, type, title);
                }
            }
        });
        return sr;
    },
    findQuery: function() {
        data =  data || {
            max:10,
            offset:0,
            sort: "lastUpdated",
            order: "desc"
        };
        data =  Ember.Object.create(data);
        console.log("Loading list of %o using parameters %o", this, data);
        var sr = SR.create({});
        $.ajax({
            url: this.urlForAction('list'),
            data: data.getJson(),
            dataType: 'json',
            statusCode: {
                200: function (result) {
                    console.log("Loaded list of %o from server: %o", this, result);
                    if(result.records) {
                        var recs = result.records;
                        recs = this.createItemRecords(recs)
                        sr.set('content', recs);
                        sr.set('total', result.total);
                    }
                    sr.resolve(sr);
                }.bind(this),
                401: function() {
                },
                500: function(response, type, title) {
                    sr.reject(response, type, title);
                }
            }
        });
        return sr;
    },
    createRecord: function() {
        Ember.assert("You must provide a valid createRecord function for your adapter", false);
    },
    updateRecord: function(record) {
        record._reset();
        var json = JSON.stringify(record.getJson());
        var model = this;
        console.log("Saving object %o", json);
        $.ajax({
            url: record.constructor.urlForAction("update"),
            dataType: 'json',
            data: json,
            contentType: 'application/json',
            type: record.get('id') ? 'PUT' : 'POST',

            beforeSend: function() {
                model.set('isAjax', true);
            },

            complete: function() {
                model.set('isAjax', false);
            },

            error: function(response, type, title) {
                var error = JSON.parse(response.responseText).error;
                model.setProperties(model.get("_backup"));
                model.set('genericError', [error, type, title]);
                model.set('messageType', "error");
                model.reject(model, error, title, type);
            },

            statusCode: {

                200: function (result) {
                    model.set('errors', null);
                    model.setProperties(model.constructor.fromJson(result.data));
                    model.set('isSaved', true);
                    model.trigger("saved", model);
                    model.resolve(model);
                },

                404: function(response, type, title) {
                    model.discard();
                    model.set('genericError', ["Not found", type, title])
                    model.reject(model, "Not found", type, title)
                },

                422: function (result, type, title) {
                    model.discard();
                    var json = JSON.parse(result.responseText);
                    if(json.errors) {
                        var errs = json.errors.errors;
                        var errors = errs.reduce(function(previousValue, item, index, enumerable) {
                            previousValue[item.field] = item.message;
                            return previousValue;
                        }, {});
                        model.set('errors', errors);
                    }
                    var error = JSON.parse(result.responseText).error;
                    if(error) {
                        model.set('genericError', [error, type, title]);
                    }
                    model.set('messageType', "error");
                    model.reject(model, "Invalid request", type, title)
                },

                500: function(response, type, title) {
                    model.discard();
                    model.reject(model, "Internal server error", type, title);
                }
            }
        });
        return model;
    },
    deleteRecord: function() {
        Ember.assert("You must provide a valid delete function for your adapter", false);
    }
});
