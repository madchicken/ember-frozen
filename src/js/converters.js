!function() {
    var converters = {};

    var getConverter = function(name) {
        return converters[name] || SimpleConverter.create({name: name});
    };

    var registerConverter = function(name, converter) {
        converters[name] = converter.create();
    };

    var SimpleConverter = Ember.Object.extend({
        init: function() {
            Ember.warn("Using Simple converter for " + this.get('name'), true);
        },

        convert: function(value) {
            if(value)
                return value.valueOf();
            return value;
        }
    });

    registerConverter('model', Ember.Object.extend({
        convert: function(value, options) {
            if(value instanceof options.destination)
                return value;
            else {
                if(value && typeof value === 'object') {
                    //try to build a new destination object
                    return options.destination.create(value);
                }
            }
            return null;
        }
    }));

    registerConverter('modelArray', Ember.Object.extend({
        convert: function(value, options) {
            if(value instanceof Array) {
                var array = [];
                for(var i = 0; i < value.length; i++) {
                    array.push(options.destination.create(value[i]))
                }
                return array;
            }
            return null;
        }
    }));

    registerConverter('string', SimpleConverter.extend({
        convert: function(value) {
            if(!Ember.isEmpty(value))
                return (new String(value)).valueOf();
            else
                return value;
        }
    }));

    registerConverter('boolean', SimpleConverter.extend({
        convert: function(value) {
            if (value  != null)
                return !!value;
            else
                return null;
        }
    }));

    registerConverter('object', SimpleConverter.extend({
        convert: function(value) {
            return value;
        }
    }));

    registerConverter('number', SimpleConverter.extend({
        convert: function(value) {
            if(value !== null && value !== undefined) {
                var num = new Number(value);
                return num.valueOf();
            }
            return value;
        }
    }));

    registerConverter('date', SimpleConverter.extend({
        isValidDate: function(d) {
            if ( Object.prototype.toString.call(d) !== "[object Date]" )
                return false;
            return !isNaN(d.getTime());
        },

        convert: function(value) {
            if(value !== null && value !== undefined) {
                if(typeof value === 'string') {
                    var d = new Date(Date.parse(value));
                    if(isNaN(d.getTime()))
                        return null;
                    else
                        return d;
                }
                else if (value instanceof Date)
                    return value;
                else {
                    var d = new Date(value);
                    if(this.isValidDate(d)) {
                        return d;
                    }
                    return null;
                }
            }
            return value;
        }
    }));

    Frzn.reopenClass({

        registerConverter: registerConverter,

        getConverter: getConverter

    });

    Frzn.SimpleConverter = SimpleConverter;
}();