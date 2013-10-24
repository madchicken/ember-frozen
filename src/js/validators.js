"use strict";
!function(){

    var NullableValidator = Ember.Object.extend({
        validate: function(value) {
            return value !== null && value !== undefined;
        }
    });

    var BlankValidator = Ember.Object.extend({
        validate: function(value) {
            return value !== '';
        }
    });

    var BlankValidator = Ember.Object.extend({
        validate: function(value) {
            return value !== '';
        }
    });

    var MinValidator = Ember.Object.extend({
        validate: function(value) {
            return value >= this.get('minValue');
        }
    });

    var MaxValidator = Ember.Object.extend({
        validate: function(value) {
            return value <= this.get('maxValue');
        }
    });

    var validators = {
        nullable: NullableValidator,
        blank: BlankValidator,
        min: MinValidator,
        max: MaxValidator
    };


    Frzn.reopenClass({
        createValidator: function(name, config) {
            if(validators[name])
                return validators[name].create(config);
            return null;
        }
    })
}();