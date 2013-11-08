describe("Frozen UrlMapping Adapter", function () {
    var Test = Em.Namespace.create({});
    var Model = Frzn.Model, attr = Frzn.attr, hasOne = Frzn.hasOne;

    describe('Ajax config', function() {
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

            var p = Test.Person.create({});
            expect(Test.Person.adapter.get('urlMapping')).not.toBeFalsy();
            var conf = Test.Person.adapter.setupAjax('find', p, {id: 42});
            expect(conf.url).toBe('person/42');
        });

        it("Should use model values as substitutions for url tokens", function() {
            Test.Person = Model.extend({
                id: attr('number'),
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

            var p = Test.Person.create({id: 42});
            var conf = Test.Person.adapter.setupAjax('find', p);
            expect(conf.url).toBe('person/42');
        });

        it("Should use prefer parameters values on model values as substitutions for url tokens", function() {
            Test.Person = Model.extend({
                id: attr('number'),
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

            var p = Test.Person.create({id: 42});
            var conf = Test.Person.adapter.setupAjax('find', p, {id: 52});
            expect(conf.url).toBe('person/52');
        });

        it('When extending the adapter, base actions must be preserved', function() {
            Test.Person = Model.extend({
                id: attr('number'),
                name: attr(),
                age: attr('number')
            });

            var BaseAdapter = Frzn.UrlMappingAdapter.extend({
                urlMapping: {
                    find: {
                        url: ':resourceURI/show/:id',
                        dataType: 'json',
                        type: 'GET'
                    }
                }
            });

            var ExtendedAdapter = BaseAdapter.extend({
                urlMapping: {
                    findQuery: {
                        url: ':resourceURI/list?name=:name',
                        dataType: 'json',
                        type: 'GET'
                    }
                }
            });

            Test.Person.adapter = ExtendedAdapter.create({});

            var p = Test.Person.create({id: 42, name: 'John'});
            var conf = Test.Person.adapter.setupAjax('find', p);
            expect(conf.url).toBe('person/show/42');
            var conf = Test.Person.adapter.setupAjax('findQuery', p, {name: 'Tom'});
            expect(conf.url).toBe('person/list?name=Tom');
        });

        it("Should use rootPath when building resource url", function() {
            Test.Person = Model.extend({
                name: attr(),
                age: attr('number')
            });

            Test.Person.adapter = Frzn.UrlMappingAdapter.create({
                rootPath: 'root/',
                urlMapping: {
                    find: {
                        url: ':resourceURI/:id',
                        dataType: 'json',
                        type: 'GET'
                    }
                }
            });

            var p = Test.Person.create({});
            expect(Test.Person.adapter.get('urlMapping')).not.toBeFalsy();
            var conf = Test.Person.adapter.setupAjax('find', p, {id: 42});
            expect(conf.url).toBe('root/person/42');
        });

        it("Should use rootPath function when building resource url", function() {
            Test.Person = Model.extend({
                name: attr(),
                age: attr('number')
            });

            Test.Person.adapter = Frzn.UrlMappingAdapter.create({
                rootPath: function() { return 'root/' },
                urlMapping: {
                    find: {
                        url: ':resourceURI/:id',
                        dataType: 'json',
                        type: 'GET'
                    }
                }
            });

            var p = Test.Person.create({});
            expect(Test.Person.adapter.get('urlMapping')).not.toBeFalsy();
            var conf = Test.Person.adapter.setupAjax('find', p, {id: 42});
            expect(conf.url).toBe('root/person/42');
        });
    });

});