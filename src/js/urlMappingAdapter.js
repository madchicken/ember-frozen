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
        urlMapping: function() {
            return this.urlMapping.reduce(function(o, p) {return Ember.merge(p, o)});
        }.property(),

        concatendatedProperties: ['urlMapping'],

        init: function() {
            this._super();
            Ember.assert("You must provide a valid url map table", this.urlMapping !== null && this.urlMapping !== undefined);
            Ember.assert("Url map table must be a valid hash object", !$.isEmptyObject(this.urlMapping));
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
            var d = this.get('urlMapping')[action];
            d = d || {url: ':resourceURI/', type: 'GET'};
            d = Ember.copy(d, true);
            var url = modelClass.url;
            if(!url) {
                url = modelClass.getName();
                url = url.substr(0, 1).toLowerCase() + url.substr(1);
            }
            d.url = d.url.replace(':resourceURI', url);
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
                    adapter._didLoad(obj, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            })
            );
            return record;
        },

        findAll: function(modelClass, records) {
            var config = this.setupAjax('findAll', modelClass);
            var adapter = this;
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    adapter._didLoadMany(obj, data, records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        findQuery: function(modelClass, records, params) {
            var config = this.setupAjax('findQuery', modelClass, params);
            var adapter = this;
            $.ajax(Ember.merge(config, {
                data: params,
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    adapter._didLoadMany(obj, data, records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        findIds: function(modelClass, records, ids) {
            var config = this.setupAjax('findIds', modelClass, {ids: ids});
            var adapter = this;
            $.ajax(Ember.merge(config, {
                success: function(data) {
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    adapter._didLoadMany(obj, data, records);
                },

                error: function(response, type, title) {
                    records.reject(response, type, title);
                }
            }));
            return records;
        },

        createRecord: function(modelClass, record) {
            var config = this.setupAjax('createRecord', modelClass, record.toJSON());
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
                    var obj = modelClass.rootProperty ? data[modelClass.rootProperty] : data;
                    adapter._didCreate(obj, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        updateRecord: function(modelClass, record) {
            var config = this.setupAjax('updateRecord', modelClass, record.toJSON());
            var adapter = this;
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
                    adapter._didUpdate(obj, record);
                },

                error: function(response, type, title) {
                    record.reject(response, type, title);
                }
            }));
            return record;
        },

        deleteRecord: function(modelClass, record) {
            var config = this.setupAjax('deleteRecord', modelClass);
            var adapter = this;
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
                    adapter._didDelete(obj, record);
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
                    adapter._didLoad(obj, record);
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