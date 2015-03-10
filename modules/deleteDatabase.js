/*
 * When a users was changed,
 * TODO
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984');

module.exports = function (dbName) {
    nano.db.destroy(dbName, function (err) {
        if (err) { return console.log('error deleting database ' + dbName + ': ', err); }
        console.log('deleted database ' + dbName);
    });
};