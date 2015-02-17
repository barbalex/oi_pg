/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var _ = require('underscore');

module.exports = function (usersDB, users, roleName) {
    var userDocnameKeys,
        userDocnames,
        userDocs,
        userDocsBulkObject;

    // get users from _users db
    userDocnameKeys = _.map(users, function (user) {
        return 'org.couchdb.user:' + user;
    });
    userDocnames      = {};
    userDocnames.keys = userDocnameKeys;

    usersDB.fetch(userDocnames, function (err, body) {
        if (err) { return console.log('error getting users: ', err); }
        userDocs = _.map(body.rows, function (row) {
            return row.doc;
        });

        // remove role from the users in _users
        _.each(userDocs, function (userDoc) {
            userDoc.roles = _.without(userDoc.roles, roleName);
        });
        userDocsBulkObject      = {};
        userDocsBulkObject.docs = userDocs;

        usersDB.bulk(userDocsBulkObject, function (err, body) {
            if (err) { return console.log('error updating userDocs: ', err); }
            //console.log('updated userDocs, removed role: ', body);
        });
    });
};