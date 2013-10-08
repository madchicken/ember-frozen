Frzn.AbstractAdapter = Ember.Object.extend({
    find: function() {
        Ember.assert("You must provide a valid find function for your adapter", false);
    },
    findAll: function() {
        Ember.assert("You must provide a valid findAll function for your adapter", false);
    },
    findQuery: function() {
        Ember.assert("You must provide a valid findQuery function for your adapter", false);
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

Frzn.QuerySearchResult = Ember.ArrayProxy.extend(Ember.DeferredMixin, {
    extractMeta: function(data) {
        var meta = {};
        if(this.adapter) {
            if(this.adapter.totalProperty) {
                meta[this.adapter.rootProperty] = data[this.adapter.rootProperty];
            }
            if(this.adapter.pageProperty) {
                meta[this.adapter.pageProperty] = data[this.adapter.pageProperty];
            }
        }
        return meta;
    }
});

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
