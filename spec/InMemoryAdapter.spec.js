describe("Frozen In Memory Adapter", function () {
    Ember.deprecate = function(){};
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

    it('Loading a model using find will call the find method on its adapter and return a promise', function() {
        var person = Test.Person.find(1);
        expect(typeof person.then).toBe('function');
        expect(person.get('name')).toBe('Paul');
        expect(person.get('age')).toBe(45);
    });

    it('Loading a model using find will populate the model and its relationships', function() {
        var person = Test.Person.find(2);
        expect(typeof person.then).toBe('function');
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        expect(person.get('address') instanceof Test.Address).toBeTruthy();
        expect(person.get('address.address')).toBe('address string 2');
    });

    it('Loading all models using findAll method will return an array of populated records with their relationships', function() {
        var persons = Test.Person.findAll();
        expect(persons.get('length')).toBe(10);
        var person = persons.objectAt(1);
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        expect(person.get('address') instanceof Test.Address).toBeTruthy();
        expect(person.get('address.address')).toBe('address string 2');
    });

    it('Loading all models using findAll method will populate meta for returned array', function() {
        var persons = Test.Person.findAll();
        expect(persons.get('length')).toBe(10);
        var meta = persons.get('meta');
        expect(meta.total).toBe(10);
        expect(meta.limit).toBe(100);
        expect(meta.offset).toBe(0);
    });

    it('Loading models using findQuery method will return a filtered array of populated records with their relationships', function() {
        var persons = Test.Person.findQuery({age: 31});
        expect(persons.get('length')).toBe(3);
        var person = persons.objectAt(0);
        expect(person.get('name')).toBe('Johny');
        expect(person.get('age')).toBe(31);
        expect(person.get('address') instanceof Test.Address).toBeTruthy();
        expect(person.get('address.address')).toBe('address string 7');
        person = persons.objectAt(1);
        expect(person.get('name')).toBe('Tim');
    });

    it('Loading models using findQuery method will return paged results', function() {
        var persons = Test.Person.findQuery({limit: 5, offset: 2});
        expect(persons.get('length')).toBe(5);
        var person = persons.objectAt(0);
        expect(person.get('name')).toBe('Michael');
        expect(person.getId()).toBe(3);
        expect(person.get('address') instanceof Test.Address).toBeTruthy();
        var meta = persons.get('meta');
        expect(meta.total).toBe(10);
        expect(meta.limit).toBe(5);
    });

    it('Loading models using findQuery with sortBy parameter set, will return a filtered and sorted array of populated records with their relationships', function() {
        var persons = Test.Person.findQuery({age: 31, sortBy: 'name'});
        expect(persons.get('length')).toBe(3);
        var person = persons.objectAt(0);
        expect(person.get('name')).toBe('Johny');
        person = persons.objectAt(1);
        expect(person.get('name')).toBe('Mel');
    });

    it('Loading models using findQuery with sortBy and sorDir parameter set, will return a filtered and sorted array of populated records with their relationships', function() {
        var persons = Test.Person.findQuery({age: 31, sortBy: 'name', sortDir: 'desc'});
        expect(persons.get('length')).toBe(3);
        var person = persons.objectAt(0);
        expect(person.get('name')).toBe('Tim');
        person = persons.objectAt(1);
        expect(person.get('name')).toBe('Mel');
    });

    it('Loading models using findIds method will return an array containing only selected records', function() {
        var persons = Test.Person.findIds(3,5,7,9);
        expect(persons.get('length')).toBe(4);
        var person = persons.objectAt(0);
        expect(person.get('name')).toBe('Michael');
        expect(person.get('age')).toBe(27);
    });

    it('Calling save on a newly created model, must persist it using the adapter', function() {
        var person = Test.Person.create({name: 'Tom', age: 39, address: {address: 'address string 11'}});
        person.save()
        expect(person.get('id')).not.toBeUndefined();
        expect(person.get('id')).not.toBeNull();
        expect(Test.Person.find(person.get('id'))).not.toBeNull();
    });

    it('Calling save on a newly created model, should update the internal adapter store', function() {
        var person = Test.Person.create({name: 'Tom', age: 39, address: {address: 'address string 11'}});
        expect(person.getClientId()).not.toBeUndefined();

        person.save()

        expect(Test.Person.adapter.store.getRecord(Test.Person.create({id: person.getId()}))).not.toBeUndefined();
        expect(Test.Person.adapter.store.getRecord(Test.Person.create({id: person.getId()}))).toBe(person);
    });
});
