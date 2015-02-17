/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var _ = require('underscore');

module.exports = function (usersDB, users, roleName) {
    var userDocnameKeys,
        userDocnames,
        userDocs,
        userDocsBulkObject;

    // get users from central DB
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

        // add new role to the users in _users
        _.each(userDocs, function (userDoc) {
            // be sure to add every role only once
            userDoc.roles = _.union(userDoc.roles, [roleName]);
        });
        userDocsBulkObject      = {};
        userDocsBulkObject.docs = userDocs;
        usersDB.bulk(userDocsBulkObject, function (err, body) {
            if (err) { return console.log('error updating userDocs: ', err); }
            //console.log('updated userDocs with new role: ', body);
        });
    });
};