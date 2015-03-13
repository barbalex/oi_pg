/*
 * When a users was changed,
 * TODO
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _    = require('underscore');

module.exports = function (dbName) {
    nano.db.list(function (error, dbNames) {
        if (error) { return console.log('error getting list of dbs'); }
        if (_.indexOf(dbNames, dbName) >= -1) {
            nano.db.destroy(dbName, function (err) {
                if (err) { return console.log('error deleting database ' + dbName + ': ', err); }
                console.log('deleted database ' + dbName);
            });
        }
    });
};