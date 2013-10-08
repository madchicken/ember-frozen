describe("Frozen Model", function () {

    var Model = Frzn.Model, attr = Frzn.attr, hasOne = Frzn.hasOne;

    it("Using attr function should create a field of type string if no parameters are given", function () {
        var MyModel = Model.extend({
            name: attr()
        });

        expect(MyModel.metaForProperty('name').type).toBe("string");
    });

    it("Attr function will save field type passed as argument in its meta properties", function () {
        var MyModel = Model.extend({
            age: attr('number')
        });

        expect(MyModel.metaForProperty('age').type).toBe("number");
    });

    it("Fields defined through the attr function should act as normal computed properties", function () {
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number')
        });

        var person = MyModel.create({name: 'John', age: 39});
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        person.set('name', 'Peter');
        expect(person.get('name')).toBe('Peter');
        person.set('age', 45);
        expect(person.get('age')).toBe(45);
    });

    it("A default value for a field will be returned when the field is undefined and a defaultValue property was given during attribute definition", function () {
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number', {defaultValue: 18})
        });

        var person = MyModel.create({name: 'John'});

        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(18);
        person.set('age', 39);
        expect(person.get('age')).toBe(39);
    });

    it('When a model is modified using set or get on a field, it should result dirty', function(){
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number', {defaultValue: 18})
        });

        var person = MyModel.create({name: 'John', age: 39});
        expect(person.isDirty()).toBe(false);
        person.set('age', 45);
        expect(person.isDirty()).toBe(true);
    });

    it('Updating a field with the same value should not modify the isDirty value', function(){
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number', {defaultValue: 18})
        });

        var person = MyModel.create({name: 'John', age: 39});
        expect(person.isDirty()).toBe(false);
        person.set('age', 39);
        expect(person.isDirty()).toBe(false);
    });

    it('Calling discard on a modified model should replace old values and put the object in non dirty status', function(){
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number', {defaultValue: 18})
        });

        var person = MyModel.create({name: 'John'});
        expect(person.get('age')).toBe(18);
        person.set('age', 39);
        expect(person.get('age')).toBe(39);
        person.discard();
        expect(person.isDirty()).toBe(false);
        expect(person.get('age')).toBe(18);
    });

    it('Calling twice a set on a field and then calling discard should return this first provided value (if no default value where provided)', function(){
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number')
        });

        var person = MyModel.create({name: 'John', age: 18});
        person.set('age', 39);
        person.set('age', 45);
        person.discard();
        expect(person.isDirty()).toBeFalsy();
        expect(person.get('age')).toBe(18);
    });

    it('Calling commit function on a model should persist in the backup object', function() {
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number')
        });

        var person = MyModel.create({name: 'John'});
        person.set('age', 39);
        person.set('age', 45);
        person.commit();
        expect(person.isDirty()).toBe(false);
        expect(person.get('age')).toBe(45);
        person.set('age', 39);
        person.discard();
        expect(person.get('age')).toBe(45);
    });

    it('Default converters must exists when library is initialized', function() {
        expect(Frzn.getConverter('string')).not.toBeUndefined();
        expect(Frzn.getConverter('number')).not.toBeUndefined();
    });

    it('Defining an attribute as number and saving it using a string, should result in a number', function() {
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number')
        });

        var person = MyModel.create({name: 'John'});
        person.set('age', '39');
        expect(typeof person.get('age')).toBe('number');
    });

    it('Setting a well formatted string for a date type should convert the value in a valid date', function() {
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date')
        });

        var person = MyModel.create({name: 'John', age: 39, birthDate: (new Date(1974, 6, 17)).toISOString()});
        expect(person.get('birthDate') instanceof Date).toBe(true);
        expect(person.get('birthDate').toISOString()).toBe((new Date(1974, 6, 17)).toISOString());
    });

    it('Setting a bad formatted string for a date type should convert to a null value', function() {
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date')
        });

        var person = MyModel.create({name: 'John', age: 39, birthDate: "bad date"});
        expect(person.get('birthDate')).toBe(null);
    });

    it('Calling toJSON on a model must return a JSON representation of the underlying data', function() {
        var MyModel = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date')
        });

        var person = MyModel.create({name: 'John', age: 39, birthDate: new Date(1974, 6, 17)});
        var json = JSON.parse(person.toJSON());
        expect(json.name).toBe('John');
        expect(json.age).toBe(39);
        expect(json.birthDate).toBe((new Date(1974, 6, 17)).toISOString());
    });

    it('Defining an hasOne relationship, should create a field definition for the given model', function() {
        var Address = Model.extend({
            address: attr()
        });
        var Person = Model.extend({
            name: attr(),
            address: hasOne(Address)
        });

        var person = Person.create({name: 'John', address: Address.create({address: 'address string'})});
        expect(person.get('address') instanceof Address).toBe(true);
        expect(person.get('address')).toBe(person.get('_relationships.address.content'));
    });

    it('Loading a model using the load function should populate the object and commit the result', function() {
        var Address = Model.extend({
            address: attr()
        });
        var Person = Model.extend({
            name: attr(),
            age: attr('number'),
            birthDate: attr('date'),
            address: hasOne(Address)
        });

        var data = {name: 'John', age: 39, birthDate: (new Date(1974, 6, 17)).toISOString(), address: {address: 'My home address'}};
        var person = Person.create({});
        person.load(data);
        expect(person.get('name')).toBe('John');
        expect(person.get('age')).toBe(39);
        expect(person.get('birthDate').toISOString()).toBe((new Date(1974, 6, 17)).toISOString());
        expect(person.get('address.address')).toBe('My home address');
    });
});