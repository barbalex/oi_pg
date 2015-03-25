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
    removeUsersProjectDbs = require('./removeUsersProjectDbs'),
    createProjectDb       = require('./createProjectDb');

module.exports = function (newDoc, oldDoc) {
    var rolesAdded,
        rolesRemoved,
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
                    _.each(rolesAdded, function (roleAdded) {
                        createProjectDb(roleAdded);
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