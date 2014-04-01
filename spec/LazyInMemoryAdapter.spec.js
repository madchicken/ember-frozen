describe("Frozen Lazy In Memory Adapter", function () {
    var Test = Ember.Namespace.create({});
    var Model = Frzn.Model.extend(), attr = Frzn.attr, hasOne = Frzn.hasOne, hasMany = Frzn.hasMany;

    Model.reopenClass({
        adapter: Frzn.InMemoryAdapter.create({
            database: {
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

    describe('Fetch relationships', function() {
        it('Should fetch a relationship when calling fetch on a non embedded relationship', function() {

        });
    });
});