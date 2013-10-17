!function() {
    var RESTAdapter = Frzn.UrlMappingAdapter.extend({
        urlMapping: {
            find: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'GET'
            },
            findAll: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'GET'
            },
            findQuery: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'GET'
            },
            findIds: {
                url: ':resourceURI/?ids=:ids',
                dataType: 'json',
                type: 'GET'
            },
            createRecord: {
                url: ':resourceURI/',
                dataType: 'json',
                type: 'POST'
            },
            updateRecord: {
                url: ':resourceURI/:id',
                dataType: 'json',
                type: 'PUT'
            }
        }
    });

    Frzn.RESTAdapter = RESTAdapter;
}();