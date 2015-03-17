/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                        = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _usersDb                    = nano.use('_users'),
    _                           = require('underscore'),
    deleteDatabase              = require('./deleteDatabase'),
    createSecurityDoc           = require('./createSecurityDoc');

module.exports = function (userDb, change) {
    // was role changed?
    // compare with last version
    // if roles were changed:
    // - always update roles in _users db
    // - if roles were added: create new projectDb's if they don't exist yet
    // - if roles were removed: remove projectDb's if no other users use them

    // check the revs
    userDb.get(change.id, { revs: true, open_revs: 'all' }, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
            securityDoc;

        console.log('change: ', change);

        userDb.get(change.id, { rev: revHash}, function (err, oldDoc) {
            if (err) { return console.log('error getting doc version before changed: ', err); }
            var rolesAdded,
                rolesRemoved,
                newDoc;

            newDoc = change.doc;
            // compare with last version
            if (oldDoc.roles && newDoc.roles && oldDoc.roles !== newDoc.roles) {
                // roles have changed
                // always update roles in _users DB
                _usersDb.get(newDoc._id, function (error, userDoc) {
                    if (error) { console.log('error getting user from _users db: ', error); }
                    userDoc.roles = newDoc.roles;
                    _usersDb.insert(userDoc, function (error) {
                        if (error) { console.log('error updating user in _users db: ', error); }
                        rolesAdded   = _.without(newDoc.roles, oldDoc.roles);
                        rolesRemoved = _.without(oldDoc.roles, newDoc.roles);

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
                            _.each(rolesRemoved, function (roleRemoved) {
                                deleteDatabase(roleRemoved);
                            });
                        }
                    });
                });
            }
        });
    });
};