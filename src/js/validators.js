!function(){

    var NullableValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} cannot be null',
        validate: function(value) {
            if(this.get('value') === true)
                return true;
            return value !== null && value !== undefined;
        }
    });

    var BlankValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} cannot be empty',
        validate: function(value) {
            if(this.get('value') === true)
                return true;
            return value !== '';
        }
    });

    var EmailValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} is not a valid email',
        regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}/,

        init: function() {
            this.get('regex').compile();
            this._super();
        },

        validate: function(value) {
            return this.get('regex').test(value);
        }
    });

    var MinValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} must be greater or equals to {{value}}',
        validate: function(value) {
            return value >= this.get('minValue');
        }
    });

    var MaxValidator = Ember.Object.extend({
        errorMessage: 'Field {{name}} must be lesser or equals to {{value}}',
        validate: function(value) {
            return value <= this.get('maxValue');
        }
    });

    var validators = {
        nullable: NullableValidator,
        blank: BlankValidator,
        min: MinValidator,
        max: MaxValidator,
        email: EmailValidator
    };

    Frzn.reopenClass({
        validators: validators,

        addValidator: function(name, clazz){
            validators[name] = clazz;
        },

        getValidator: function(name, config) {
            if(validators[name]) {
                if(typeof config !== 'object') {
                    config = {value: config};
                }
                return validators[name].create(config);
            }
            return null;
        }
    });

    var initValidators = function(model, name, options) {
        if(options && !$.isEmptyObject(options)) {
            var validators = get(model, '_validators');
            var a = []
            for(var k in options) {
                if(options.hasOwnProperty(k)) {
                    var v = Frzn.getValidator(k, options[k]);
                    if(v) {
                        a.push(v);
                    }
                }
            }
            validators[name] = a;
        }
    };

    Frzn.Model.reopen({
        validate: function() {
            var validators = get(this, '_validators');
            var errors = [];
            if(!$.isEmptyObject(validators)) {
                for(var k in validators) {
                    if(validators.hasOwnProperty(k)) {
                        var a = validators[k];
                        for(var i = 0; i < k.length; k++) {
                            if(!k[i].validate()) {
                                errors.push(k);
                            }
                        }
                    }
                }
            }
            set(this, 'errors', errors);
            return errors.length > 0;
        },

        initValidators: function(field, options) {
            return initValidators(this, field, options);
        }
    });
}();