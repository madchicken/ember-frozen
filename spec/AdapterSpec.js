describe("Frozen Adapter", function () {
    var Test = Ember.Namespace.create({});
    var Model = Frzn.Model, attr = Frzn.attr, hasOne = Frzn.hasOne, hasMany = Frzn.hasMany;
    Frzn.Fixtures['person'] = {
        1: {name: 'John', age: 39},
        2: {name: 'John', age: 39, address: {address: 'address string'}}
    }
    Model.reopenClass({
        adapter: Frzn.FixturesAdapter.create()
    });

    it('Loading a model using find will call the find method on its adapter and return a promise', function() {
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number')
        });

        var person = Test.Person.find(1);
        expect(typeof person.then).toBe('function');
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
    });

    it('Loading a model using find will populate the model and its relationships', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            address: hasOne(Test.Address)
        });

        var person = Test.Person.find(2);
        expect(typeof person.then).toBe('function');
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        expect(person.get('address.address')).toBe('address string');
    });
});