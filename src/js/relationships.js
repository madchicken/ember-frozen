!function() {
    var get = Ember.get, set = Ember.set, getConverter = Frzn.getConverter;

    var Relationship = Em.Mixin.create({
        getObjectClass: function() {
            return this.get('options.destination');
        },

        toPlainObject: function(){
            var content = this.get('content');
            if(content) {
                return content.toPlainObject();
            }
            return null;
        },

        commit: function() {
            var content = this.get('content');
            if(content) {
                return content.commit();
            }
        },

        discard: function() {
            var content = this.get('content');
            if(content) {
                return content.discard();
            }
        },

        resolve: function() {
            var content = this.get('content');
            if(content) {
                content.resolve(content);
            }
        },

        fetch: function() {
            var content = this.get('content');
            if(content) {
                return content.fetch();
            }
            return null;
        }
    });

    var HasManyRelationship = Ember.ArrayProxy.extend(Relationship, {
        init: function () {
            this.set('content', Em.A([]));
            this._super();
        },

        create: function(data) {
            var o = this.getObjectClass().create(data);
            this.pushObject(o);
            return o;
        },

        toPlainObject: function() {
            var content = this.get('content');
            var data = [];
            if(content) {
                content.forEach(function(o) {
                    data.push(o.toPlainObject());
                });
            }
            return data;
        },

        commit: function() {
            var content = this.get('content');
            if(content) {
                content.forEach(function(o) {
                    o.commit();
                });
            }
        },

        discard: function() {
            var content = this.get('content');
            if(content) {
                content.forEach(function(o) {
                    o.discard();
                });
            }
        },

        resolve: function() {
            var content = this.get('content');
            if(content) {
                content.forEach(function(o) {
                    o.resolve(o);
                });
            }
            return null;
        },

        fetch: function() {
            var content = this.get('content');
            if(content) {
                return this.getObjectClass().findIds(content.reduce(function(array, model) {
                    array.push(model.getId());
                    return array;
                }, []));
            }
            return null;
        }
    });

    var HasOneRelationship = Ember.ObjectProxy.extend(Relationship, {
    });

    var BelongsToRelationship = Ember.ObjectProxy.extend(Relationship, {
    });

    var relationships = {
        hasOne: HasOneRelationship,
        hasMany: HasManyRelationship,
        belongsTo: BelongsToRelationship
    };

    Frzn.reopenClass({
        relationships: relationships,

        hasMany: function (destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : true;
            Frzn.registerConverter("hasMany"+destination, getConverter('modelArray').constructor.extend({}));
            return Frzn.attr("hasMany"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'hasMany', destination: destination}))
        },

        hasOne: function(destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : true;
            Frzn.registerConverter("hasOne"+destination, getConverter('model').constructor.extend({}));
            return Frzn.attr("hasOne"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'hasOne', destination: destination}))
        },

        belongsTo: function(destination, options) {
            options = options || {};
            options.embedded = options.embedded !== undefined ? options.embedded : false;
            var ModelConverter = getConverter('model');
            Frzn.registerConverter("belongsTo"+destination, getConverter('model').constructor.extend({}));
            return Frzn.attr("belongsTo"+destination, Ember.merge(options, {isRelationship: true, relationshipType: 'belongsTo', destination: destination}))
        }
    })
}();