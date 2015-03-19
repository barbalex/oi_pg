/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano     = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _usersDb = nano.use('_users'),
    _        = require('underscore');

module.exports = function (dbName) {
    // first check if this db still exists
    nano.db.list(function (error, dbNames) {
        if (error) { return console.log('error getting list of dbs: ', error); }
        if (_.indexOf(dbNames, dbName) >= -1) {
            // check if a user uses this db
            _usersDb.list(function (error, body) {
                if (error) { return console.log('error getting list of users from _users db: ', error); }
                var users      = body.rows,
                    usersRoles = [];

                _.each(users, function (user) {
                    usersRoles = _.union(usersRoles, user.roles);
                });

                if (_.contains(usersRoles, dbName)) {
                    // another user uses this db
                    // DONT remove it
                    console.log('db ' + dbName + ' not deleted because used by other user');
                } else {
                    // stop listening to changes
                    if (GLOBAL[dbName]) { GLOBAL[dbName].stop(); }
                    nano.db.destroy(dbName, function (err) {
                        if (err) { return console.log('error deleting database ' + dbName + ': ', err); }
                        console.log('deleted database ' + dbName);
                    });
                }
            });
        }
    });
};