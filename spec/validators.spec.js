describe('Model validators', function() {
    var Test = Em.Namespace.create({});
    var Model = Frzn.Model, attr = Frzn.attr, hasOne = Frzn.hasOne;

    it('It should add a blank validator if blank is provided in field options', function() {
        Test.Person = Model.extend({
            id: attr('number'),
            name: attr(),
            age: attr('number', {blank: false})
        });

        var person = Test.Person.create({age: null});
        var validators = person.get('_validators');
        //expect(validators.age).toBeDefined();
    });
});