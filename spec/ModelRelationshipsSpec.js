describe("Frozen Model Relationships", function() {
    var Test = Ember.Namespace.create({name: 'Test'});
    var Model = Frzn.Model, attr = Frzn.attr, hasOne = Frzn.hasOne, hasMany = Frzn.hasMany;

    it('Defining an hasOne relationship, should create an object field definition for the given model', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            address: hasOne(Test.Address)
        });

        var person = Test.Person.create({name: 'John', address: Test.Address.create({address: 'address string'})});
        expect(person.get('address').getObjectClass()).toBe(Test.Address);
        expect(person.get('address')).toBe(person.get('_relationships.address'));
        expect(person.get('address.address')).toBe('address string');
    });

    it('Defining an hasOne relationship using a string as type, should create an object field definition for the given model', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            address: hasOne('Test.Address')
        });

        var person = Test.Person.create({name: 'John', address: Test.Address.create({address: 'address string'})});
        expect(person.get('address').getObjectClass()).toBe(Test.Address);
        expect(person.get('address')).toBe(person.get('_relationships.address'));
        expect(person.get('address.address')).toBe('address string');
    });

    it('Loading a model with an hasOne relationship using the load function should populate the object with all its children', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date'),
            address: hasOne(Test.Address)
        });

        var data = {name: 'John', age: 39, birthDate: (new Date(1974, 6, 17)).toISOString(), address: {address: 'My home address'}};
        var person = Test.Person.create({});
        person.load(data);
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        expect(person.get('birthDate').toISOString()).toBe((new Date(1974, 6, 17)).toISOString());
        expect(person.get('address.address')).toBe('My home address');
    });

    it('Defining an hasMany relationship, should create an array field definition for the given model', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date'),
            addresses: hasMany(Test.Address)
        });

        var person = Test.Person.create({
            name: 'John',
            age: 39,
            birthDate: (new Date(1974, 6, 17)).toISOString(),
            addresses: [{address: 'My home address 1'}, {address: 'My home address 2'}]
        });
        expect(person.get('addresses.length')).toBe(2);
        expect(person.get('addresses._options.embedded')).toBeFalsy()
        expect(person.get('addresses').getObjectClass()).toBe(Test.Address);
        expect(person.get('addresses').objectAt(0).get('address')).toBe('My home address 1');
    });

    it('Trying to set a non array value for a hasMany relationship field, must set to null the field value', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date'),
            addresses: hasMany(Test.Address)
        });

        var person = Test.Person.create({
            name: 'John',
            age: 39,
            birthDate: (new Date(1974, 6, 17)).toISOString(),
            addresses: {address: 'My home address 1'}
        });
        expect(person.get('addresses.length')).toBe(0);
        expect(person.get('addresses.content')).toBeNull();
    });

    it('A new object can be added to an hasMany collection using create method', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date'),
            addresses: hasMany(Test.Address)
        });

        var person = Test.Person.create({
            name: 'John',
            age: 39,
            birthDate: (new Date(1974, 6, 17)).toISOString()
        });
        expect(person.get('addresses.length')).toBe(0);
        person.get('addresses').create({address: 'My home address 1'});
        expect(person.get('addresses.length')).toBe(1);
    });

});