!function() {
    var RESTAdapter = Frzn.UrlMappingAdapter.extend({
        urlMapping: {
            find: {
                url: ':resourceURI/:id',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                type: 'GET'
            },
            findAll: {
                url: ':resourceURI/',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                type: 'GET'
            },
            findQuery: {
                url: ':resourceURI/',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                type: 'GET'
            },
            findIds: {
                url: ':resourceURI/?ids=:ids',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                type: 'GET'
            },
            createRecord: {
                url: ':resourceURI/',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                type: 'POST'
            },
            updateRecord: {
                url: ':resourceURI/:id',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                type: 'PUT'
            },
            deleteRecord: {
                url: ':resourceURI/:id',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                type: 'DELETE'
            }
        }
    });

    Frzn.RESTAdapter = RESTAdapter;
}();