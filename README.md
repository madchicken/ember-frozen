Ember Frozen [![Build Status](https://travis-ci.org/madchicken/ember-frozen.png)](https://travis-ci.org/madchicken/ember-frozen)
===

Another persistence layer for the amazing Emberjs Library

### Maintainer

[Pierpaolo Follia](https://github.com/madchicken)

### Get Started

Install dependencies

`sudo npm install && bower install`

Build Project

`grunt`

Run Tests

Open `SpecRunner.html` in your browser and test with jasmine

### How to use

## Defining models

Define your models by extending Frzn.Model class:
```javascript
var attr = Frzn.attr, hasMany = Frzn.hasMany;
var App.Address = Frzn.Model.extend({
    city: attr('string'), //a string attribute
    formattedAddress: attr() //default type for an attribute is always 'string'
});
```

You can use different types of attributes: string, date, number, boolean or object (no data conversion)
```javascript
var attr = Frzn.attr, hasMany = Frzn.hasMany;
var App.Person = Frzn.Model.extend({
    name: attr(), //default type for an attribute is 'string'
    age: attr('number'), //data will be converted using Number type
    birthDate: attr('date'), //data will be converted using Date type
    enabled: attr('boolean'), //stores true or false values
    data: attr('object') //pass-through converter
});
```

##Relationships

You can express model relationships using hasOne, hasMany and belongsTo methods

```javascript
var attr = Frzn.attr, hasMany = Frzn.hasMany;
var App.Person = Frzn.Model.extend({
    name: attr(), //default type for an attribute is 'string'
    age: attr('number'), //Javascript Number will be used to store data
    birthDate: attr('date'), //Javascript Date will be used to store data,
    enabled: attr('boolean'), //Stores true or false values
    addresses: hasMany('App.Address'),
    portfolio: hasOne('App.Portfolio'),
    directory: belongsTo('App.Portfolio')
});
```

By default Frozen uses embedded relationships. This means that when expressing something like:

```javascript
Test.Address = Model.extend({
    id: attr('number),
    address: attr()
});
Test.Person = Model.extend({
    id: attr('number),
    name: attr(),
    age: attr('number'),
    address: hasOne('Test.Address')
});
```

the library expect a JSON like this:

```javascript
{
    id: 1,
    name: 'John',
    age: 42,
    address: {
        id: 1,
        address: 'An address'
    }
}
```

If you want to use 'lazy' object relationships, simple specify it using options:

```javascript
Test.Address = Model.extend({
    id: attr('number),
    address: attr()
});
Test.Person = Model.extend({
    id: attr('number),
    name: attr(),
    age: attr('number'),
    address: hasOne('Test.Address', {embedded: false})
});
```

so the expected JSON will be:

```javascript
{
    id: 1,
    name: 'John',
    age: 42,
    address: {
        id: 1
    }
}
```

Fetching related objects (embedded or not) it's easy: simple use the reload method:

```javascript

var person = App.Person.find(1);
var address = person.get('address').reload();

```

## Adapters

In order to access to your backend, you must use an adapter. Frozen gives you the possibility to define your own adapter
by extending Frzn.AbstractAdapter class. By default Frozen library provides some predefined adapters:

* AbstractAdapter - A basic adapter that doesn't implement any operation. It's used as base class for others adapters.
* UrlMappingAdapter - An adapter that can be configured to map actions to urls (with a given method).
* RESTAdapter - An extension of UrlMapping adapter, already configured to communicate with a RESTful server.

When defining a model, you must provide an adapter to be used to communicate with your backend:

```javascript

Test.Person.adapter = Frzn.RESTAdapter.create({});

```

By default RESTAdapter (and UrlMappingAdapter) use the name of the model to infer the url for your resource. So, in the
previous example the url for the Person resource will be `person/`. If you want customize the url, just use the `url`
property in the model class:


```javascript

Test.Person.adapter = Frzn.RESTAdapter.create({});
Test.Person.url = 'user/';

```

## Converters

TODO

## Validators

TODO


### License

The MIT License (MIT)

Copyright (c) 2013 VaiPra.La

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
