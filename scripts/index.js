#!/usr/bin/env node
var _ = require('underscore');
var config = require('../config/default.js');

if (process.env.NODE_ENV !== 'production') {
    _.extend(config, require('../config/development.js'));
}
var model = require('../lib/model')(config);

model.getCollection('slide', function (err, collection) {
    if (err) { throw err; }
    collection.ensureIndex({ created_at: -1 }, function (err, result) {
        if (err) { throw err; }
        console.log(result);
    });
    collection.ensureIndex({ registered_by: 1 }, function (err, result) {
        if (err) { throw err; }
        console.log(result);
    });
});
model.getCollection('message', function (err, collection) {
    if (err) { throw err; }
    collection.ensureIndex({ room: 1, created_at: 1 }, function (err, result) {
        if (err) { throw err; }
        console.log(result);
    });
});
