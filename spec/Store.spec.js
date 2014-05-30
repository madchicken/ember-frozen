describe('Store', function () {

    var Test = Ember.Namespace.create({});
    var Model = Frzn.Model.extend(), attr = Frzn.attr, hasOne = Frzn.hasOne;

    var PersonAdapter = Frzn.InMemoryAdapter.create({
        database: [
            {id: 1, name: 'Paul', age: 45, address: {id: 1, address: 'address string 1'}},
            {id: 2, name: 'John', age: 39, address: {id: 2, address: 'address string 2'}},
            {id: 3, name: 'Michael', age: 27, address: {id: 3, address: 'address string 3'}},
            {id: 4, name: 'Jonathan', age: 28, address: {id: 4, address: 'address string 4'}},
            {id: 5, name: 'Peter', age: 29, address: {id: 5, address: 'address string 5'}},
            {id: 6, name: 'Sam', age: 30, address: {id: 6, address: 'address string 6'}},
            {id: 7, name: 'Johny', age: 31, address: {id: 7, address: 'address string 7'}},
            {id: 8, name: 'Tim', age: 31, address: {id: 8, address: 'address string 8'}},
            {id: 9, name: 'Mel', age: 31, address: {id: 9, address: 'address string 9'}},
            {id: 10, name: 'Luke', age: 32, address: {id: 10, address: 'address string 10'}}
        ]
    });

    var AddressAdapter = Frzn.InMemoryAdapter.create({
        database: [
            {id: 1, address: 'address string 1'},
            {id: 2, address: 'address string 2'},
            {id: 3, address: 'address string 3'},
            {id: 4, address: 'address string 4'},
            {id: 5, address: 'address string 5'},
            {id: 6, address: 'address string 6'},
            {id: 7, address: 'address string 7'},
            {id: 8, address: 'address string 8'},
            {id: 9, address: 'address string 9'},
            {id: 10, address: 'address string 10'}
        ]
    });

    Test.Address = Model.extend({
        address: attr()
    });
    Test.Address.adapter = AddressAdapter;
    Test.Person = Model.extend({
        name: attr(),
        age: attr('number'),
        address: hasOne(Test.Address)
    });
    Test.Person.adapter = PersonAdapter;

    it('It should replace objects stored with clientId with those with an id', function() {
        expect(Test.Person.adapter.store.get('content').get('Person')).toBeUndefined();
        var person1 = Test.Person.create({name: 'Pierpaolo', age: 40, address: {address: 'Via G. Botero 1'}});
        person1.save();
        expect(Test.Person.adapter.store.get('content').get('Person').length).toBe(1);
        expect(person1.getId()).not.toBeUndefined();
        expect(person1.getId().length).toBe(8); //default id length
        var person2 = Test.Person.find(person1.getId());
        expect(person1).toBe(person2);
        expect(Test.Person.adapter.store.get('content').get('Person').length).toBe(1);
    });

    it('It should return the same object if it is already present in the store', function() {
        var person1 = Test.Person.find(3);
        var person2 = Test.Person.find(3);
        expect(person1).toBe(person2);
    });
});
