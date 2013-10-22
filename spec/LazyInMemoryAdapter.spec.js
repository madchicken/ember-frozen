describe("Frozen Lazy In Memory Adapter", function () {
    var Test = Ember.Namespace.create({});
    var Model = Frzn.Model.extend(), attr = Frzn.attr, hasOne = Frzn.hasOne, hasMany = Frzn.hasMany;

    Model.reopenClass({
        adapter: Frzn.InMemoryAdapter.create({
            store: {
                Person: [
                    {id: 1, name: 'Paul', age: 45, address: {id: 1}},
                    {id: 2, name: 'John', age: 39, address: {id: 2}},
                    {id: 3, name: 'Michael', age: 27, address: {id: 3}},
                    {id: 4, name: 'Jonathan', age: 28, address: {id: 4}},
                    {id: 5, name: 'Peter', age: 29, address: {id: 5}},
                    {id: 6, name: 'Sam', age: 30, address: {id: 6}},
                    {id: 7, name: 'Johny', age: 31, address: {id: 7}},
                    {id: 8, name: 'Tim', age: 31, address: {id: 8}},
                    {id: 9, name: 'Mel', age: 31, address: {id: 9}},
                    {id: 10, name: 'Luke', age: 32, address: {id: 10}}
                ],
                Address: [
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
            },

            extractMeta: function(data, records) {
                records.set('meta', {
                    page: 1,
                    offset: 0,
                    max: 5,
                    total: 10
                });
            }
        })
    });

    it('Loading a model using find will call the find method on its adapter and return a promise', function() {
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number')
        });

        var person = Test.Person.find(1);
        expect(typeof person.then).toBe('function');
        expect(person.get('name')).toBe('Paul');
        expect(person.get('age')).toBe(45);
    });

    it('Loading a model using find will populate the model and accessing to relationships will automatically fetch linked objects', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            address: hasOne(Test.Address, {embedded: false})
        });

        var person = Test.Person.find(2);
        expect(typeof person.then).toBe('function');
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        expect(person.get('address') instanceof Test.Address).toBeTruthy();
        expect(person.get('address.address')).toBe('address string 2');
    });

    it('Loading all models using findAll method will return an array of populated records with their relationships', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            address: hasOne(Test.Address, {embedded: false})
        });

        var persons = Test.Person.findAll();
        expect(persons.get('length')).toBe(10);
        var person = persons.objectAt(1);
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        expect(person.get('address') instanceof Test.Address).toBeTruthy();
        expect(person.get('address.address')).toBe('address string 2');
    });

    it('Loading all models using findAll method will populate meta for returned array', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            address: hasOne(Test.Address, {embedded: false})
        });

        var persons = Test.Person.findAll();
        expect(persons.get('length')).toBe(10);
        var meta = persons.get('meta');
        expect(meta.total).toBe(10);
        expect(meta.max).toBe(5);
        expect(meta.offset).toBe(0);
    });

    it('Loading models using findQuery method will return a filtered array of populated records with their relationships', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            address: hasOne(Test.Address, {embedded: false})
        });

        var persons = Test.Person.findQuery({age: 31});
        expect(persons.get('length')).toBe(3);
        var person = persons.objectAt(0);
        expect(person.get('name')).toBe('Johny');
        expect(person.get('age')).toBe(31);
        expect(person.get('address') instanceof Test.Address).toBeTruthy();
        expect(person.get('address.address')).toBe('address string 7');
    });

    it('Loading models using findIds method will return an array containing only selected records', function() {
        Test.Address = Model.extend({
            address: attr()
        });
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number'),
            address: hasOne(Test.Address, {embedded: false})
        });

        var persons = Test.Person.findIds(3,5,7,9);
        expect(persons.get('length')).toBe(4);
        var person = persons.objectAt(0);
        expect(person.get('name')).toBe('Michael');
        expect(person.get('age')).toBe(27);
    });
});