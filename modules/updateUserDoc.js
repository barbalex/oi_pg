/*
 * when userDoc changes
 * - get last version
 * - compare roles:
 *   - if roles were added: create projectDb's
 *   - if roles were removed: remove projectDb's if no other users use them
 *   - if roles have changed: update roles in _users db
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                  = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _usersDb              = nano.use('_users'),
    _                     = require('underscore'),
    deleteDatabase        = require('./deleteDatabase'),
    createSecurityDoc     = require('./createSecurityDoc'),
    removeUsersProjectDbs = require('./removeUsersProjectDbs');

module.exports = function (newDoc, oldDoc) {
    var rolesAdded,
        rolesRemoved,
        securityDoc,
        userName;

    if ((oldDoc && newDoc && oldDoc.roles && newDoc.roles && oldDoc.roles !== newDoc.roles) || (!oldDoc && newDoc && newDoc.roles)) {
        // roles have changed
        // or no oldDoc, so assume they have changed
        // always update roles in _users DB
        _usersDb.get(newDoc._id, function (error, userDoc) {
            if (error) { console.log('error getting user from _users db: ', error); }

            userDoc.roles = newDoc.roles;
            _usersDb.insert(userDoc, function (error) {
                if (error) { console.log('error updating user in _users db: ', error); }

                rolesAdded   = oldDoc ? _.difference(newDoc.roles, oldDoc.roles) : newDoc.roles;
                rolesRemoved = oldDoc ? _.difference(oldDoc.roles, newDoc.roles) : [];

                console.log('handleChangesInUserDb: rolesAdded: ', rolesAdded);
                console.log('handleChangesInUserDb: rolesRemoved: ', rolesRemoved);

                if (rolesAdded) {
                    // if roles were added: create new projectDb's if they don't exist yet
                    // get list of DB's in couch
                    nano.db.list(function (error, dbNames) {
                        if (error) { return console.log('error getting list of db\'s: ', error); }
                        // create new projectDb if it does not exist yet
                        _.each(rolesAdded, function (roleAdded) {
                            if (_.indexOf(dbNames, roleAdded) === -1) {
                                nano.db.create(roleAdded, function (error) {
                                    if (error) { return console.log('error creating new db ' + roleAdded + ':', error); }

                                    console.log('created new db: ', roleAdded);

                                    // set up permissions for this role
                                    securityDoc = createSecurityDoc(null, roleAdded, 'barbalex');
                                    nano.use(roleAdded).insert(securityDoc, '_security', function (error) {
                                        if (error) { return console.log('error setting _security in new db ' + roleAdded + ': ', error); }
                                    });
                                });
                            }
                        });
                    });
                }
                if (rolesRemoved) {
                    userName = newDoc.name;
                    removeUsersProjectDbs(userName, rolesRemoved);
                }
            });
        });
    }
};