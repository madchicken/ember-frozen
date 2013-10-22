describe("Frozen UrlMapping Adapter", function () {
    var Test = Em.Namespace.create({});
    var Model = Frzn.Model, attr = Frzn.attr, hasOne = Frzn.hasOne;

    it("Should infer the url of a resource from its name", function() {
        Test.Person = Model.extend({
            name: attr(),
            age: attr('number')
        });

        Test.Person.adapter = Frzn.UrlMappingAdapter.create({
            urlMapping: {
                find: {
                    url: ':resourceURI/:id',
                    dataType: 'json',
                    type: 'GET'
                }
            }
        });


        var conf = Test.Person.adapter.setupAjax('find', Test.Person, {id: 42});
        expect(conf.url).toBe('person/42');
    });
});