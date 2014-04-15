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

        mergedProperties: ['urlMapping'],

        init: function() {
            this._super();
            Ember.assert("You must provide a valid url map table", this.get('urlMapping') !== null && this.get('urlMapping') !== undefined && !$.isEmptyObject(this.get('urlMapping')));
            Ember.assert("Url map table must be a valid hash object", !$.isEmptyObject(this.get('urlMapping')));
        },

        /**
         * Retrieve the url information for a given action.
         * This method look in the urlMapping table to find configuration for the requested action.
         * It performs substitutions in the given string using passed parameters.
         * @param action - the action you want the url for
         * @param model - the actual model class
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

            var mapping = this.get('urlMapping');
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
            if(this.rootPath) {
                if(typeof this.rootPath === 'function')
                    actionData.url = this.rootPath() + actionData.url;
                else
                    actionData.url = this.rootPath + actionData.url;
            }

            return actionData;
        },

        /**
         * @inheritDoc
         */
        find: function(modelClass, record, id) {
            var recordInStore = this.getFromStore(record);
            var config = this.setupAjax('find', record, {id: id});
            var adapter = this;
            if(recordInStore) {
                record = recordInStore;
                record.resetPromise().resolve(record);
            } else {
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
            }
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
            this.getCacheFor(modelClass.getName())[record.getClinetId()] = record;
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