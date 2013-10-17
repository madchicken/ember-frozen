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
    birthDate: attr('date'), //data will be converted using Data type
    enabled: attr('boolean'), //stores true or false values
    data: attr('object') //pass-through converter
});
```

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

In order to access to your backend, you must use an adapter. Frozen gives you the possibility to define your own adapter by extending
Frzn.AbstractAdapter class. By default Frozen library provides some predefined adapters:

* InMemoryAdapter - Stores data in a hash map, useful for tests
* UrlMappingAdapter - An adapter that can be configured to map actions to urls (with a given method)
* RESTAdapter - An extension of UrlMapping adapter, already configured to communicate with a RESTful server

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
