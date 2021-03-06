(function () {
    'use strict';
    Frzn.Store = Ember.ObjectProxy.extend({
        init: function() {
            this._super();
            this.set('content', Ember.Map.create({}));
        },

        getCacheFor: function(name) {
            if (!this.get('content').has(name)) {
                this.get('content').set(name, Ember.Map.create({}));
            }
            return this.get('content').get(name);
        },

        putRecord: function(record) {
            var store = this.getCacheFor(record.constructor.getName());
            var old = store.get(record.getId()) || store.get(record.getClientId());
            if(old) {
                old.load(record.toPlainObject());
                if(old.getId()) {
                    store.set(old.getId(), old);
                    store.remove(old.getClientId());
                } else {
                    store.set(old.getClientId(), old);
                }
            } else {
                if(record.getId()) {
                    store.set(record.getId(), record);
                    store.remove(record.getClientId());
                } else {
                    store.set(record.getClientId(), record);
                }
            }

            return old ? old : record;
        },

        getRecord: function(record) {
            var store = this.getCacheFor(record.constructor.getName());
            return store.get(record.getId()) || store.get(record.getClientId());
        },

        removeRecord: function(record) {
            var store = this.getCacheFor(record.constructor.getName());
            store.remove(record.getId());
            store.remove(record.getClientId());
        },

        clearCache: function(name) {
            this.set('content.' + name, Ember.Object.create({}));
        }
    });
})();