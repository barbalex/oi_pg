/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                  = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _usersDb              = nano.use('_users'),
    _                     = require('underscore'),
    deleteDatabase        = require('./deleteDatabase'),
    createSecurityDoc     = require('./createSecurityDoc'),
    removeUsersProjectDbs = require('./removeUsersProjectDbs');

module.exports = function (userDb, change) {
    // was role changed?
    // compare with last version
    // if roles were changed:
    // - always update roles in _users db
    // - if roles were added: create new projectDb's if they don't exist yet
    // - if roles were removed: remove projectDb's if no other users use them

    var newDoc = change.doc;

    // check the revs
    userDb.get(change.id, { revs_info: true }, function (error, doc) {
        if (error) { return console.log('error getting revs of doc: ', error); }

        var revisions = doc._revs_info,
            securityDoc,
            rolesAdded,
            rolesRemoved,
            revOfOldDoc,
            userName;

        //console.log('handleChangesInUserDb: change: ', change);
        console.log('handleChangesInUserDb: revisions: ', revisions);

        if (revisions.length === 1) {
            // this is a new user doc
            // there will be no roles yet
            return console.log('new user doc, not setting roles');
        }

        // get last version
        revOfOldDoc = revisions[1].rev;
        userDb.get(change.id, { rev: revOfOldDoc }, function (error, oldDoc) {
            if (error) { return console.log('error getting last version of user doc: ', error); }

            console.log('handleChangesInUserDb: newDoc: ', newDoc);
            console.log('handleChangesInUserDb: oldDoc: ', oldDoc);

            // compare with last version
            if (oldDoc && oldDoc.roles && newDoc.roles && oldDoc.roles !== newDoc.roles) {
                // roles have changed
                // always update roles in _users DB
                _usersDb.get(newDoc._id, function (error, userDoc) {
                    if (error) { console.log('error getting user from _users db: ', error); }
                    userDoc.roles = newDoc.roles;
                    _usersDb.insert(userDoc, function (error) {
                        if (error) { console.log('error updating user in _users db: ', error); }
                        rolesAdded   = _.difference(newDoc.roles, oldDoc.roles);
                        rolesRemoved = _.difference(oldDoc.roles, newDoc.roles);

                        //console.log('handleChangesInUserDb: oldDoc.roles: ', oldDoc.roles);
                        //console.log('handleChangesInUserDb: newDoc.roles: ', newDoc.roles);
                        console.log('handleChangesInUserDb: rolesAdded: ', rolesAdded);
                        console.log('handleChangesInUserDb: rolesRemoved: ', rolesRemoved);

                        if (rolesAdded) {
                            // if roles were added: create new projectDb's if they don't exist yet
                            // get list of projectDb's
                            nano.db.list(function (error, dbNames) {
                                if (error) { return console.log('error getting list of users from _users db: ', error); }
                                // create new projectDb if it does not exist yet
                                _.each(rolesAdded, function (roleAdded) {
                                    if (_.indexOf(dbNames, roleAdded) === -1) {
                                        nano.db.create(roleAdded, function (err) {
                                            if (err) { return console.log('error creating new database ' + roleAdded + ': ', err); }

                                            console.log('created new db: ', roleAdded);

                                            // set up permissions for this role
                                            securityDoc = createSecurityDoc(null, roleAdded, 'barbalex');
                                            nano.use(roleAdded).insert(securityDoc, '_security', function (err, body) {
                                                if (err) { return console.log('error setting _security in new project DB ' + roleAdded + ': ', err); }
                                                //console.log('answer from setting _security in new project DB: ', body);
                                            });
                                        });
                                    }
                                });
                            });
                        }

                        if (rolesRemoved) {
                            // if roles were removed: remove projectDb's if no other users use them
                            /*_.each(rolesRemoved, function (roleRemoved) {
                                deleteDatabase(roleRemoved);
                            });*/
                            userName = newDoc.name;

                            console.log('handleChangesInUserDb: userName: ', userName);

                            removeUsersProjectDbs(userName, rolesRemoved);
                        }
                    });
                });
            }
        });
    });
};