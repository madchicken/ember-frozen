!function () {
    var get = Ember.get, set = Ember.set;

    Frzn.Store = Ember.ObjectProxy.extend({
        init: function() {
            this._super();
            this.set('content', Ember.Object.create({}));
        },

        getMapFor: function(name) {
            if (this.get('content.' + name) === undefined) {
                this.set('content.' + name, Ember.Object.create({}));
            }
            return this.get('content.' + name);
        },

        putRecord: function(record) {
            var store = this.getMapFor(record.constructor.getName());
            if(store) {
                var id = record.getClientId();
                var old = get(store, id);
                if(old) {
                    old.load(record.toPlainObject());
                } else {
                    set(store, id, record);
                }

                return old || record;
            }
            return null;
        },

        getRecord: function(record) {
            var store = this.getMapFor(record.constructor.getName());
            if(store) {
                var id = record.getClientId();
                return get(store, id);
            }
            return null;
        },

        removeRecord: function(record) {
            var store = this.getMapFor(record.constructor.getName());
            if(store) {
                var id = record.getClientId();
                set(store, id, null);
            }
        }
    });
}();