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

    // TODO: if roles added: create new projectDb's

    // TODO: if roles removed: 
    // - remove projectDb's if no other users use them
    
    // check the revs
    userDb.get(change.id, { revs: true, open_revs: 'all' }, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
            doc,
            projectDbName,
            projectDbNameDb,
            securityDoc;

        console.log('change: ', change);

        userDb.get(change.id, { rev: revHash}, function (err, oldDoc) {
            if (err) { return console.log('error getting doc version before changed: ', err); }
            var rolesAdded,
                rolesRemoved,
                newDoc,
                usersToAddRole,
                usersToRemoveRole,
                roleName;

            newDoc = change.doc;

            if (oldDoc.roles && newDoc.roles && oldDoc.roles !== newDoc.roles) {
                // update roles in _users DB
                _usersDb.get(newDoc._id, function (error, userDoc) {
                    if (error) { console.log('error getting user from _users db: ', error); }
                    userDoc.roles = newDoc.roles;
                    _usersDb.insert(userDoc, function (error) {
                        if (error) { console.log('error updating user in _users db: ', error); }
                        // roles were changed
                        rolesAdded   = _.without(newDoc.roles, oldDoc.roles);
                        rolesRemoved = _.without(oldDoc.roles, newDoc.roles);

                        if (rolesAdded) {
                            // TODO: if roles added: create new projectDb's
                            
                        }

                        if (rolesRemoved) {
                            // TODO: remove projectDb's if no other users use them

                        }
                    });
                });
            }
        });

        if (change.deleted) {
            // a doc was deleted
            projectDbName = 'project_' + change.id;
            deleteDatabase(projectDbName);

            // stop listening to changes
            GLOBAL[projectDbName].stop();
        } else {
            // a new doc was created or an existing changed
            doc = change.doc;
            if (revisions.start === 1) {
                // a new doc was created

                console.log('change: new doc was created');

                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // a new project was created

                    console.log('change: new project was created');

                    // create a new database for the project
                    projectDbName = 'project_' + change.id;
                    nano.db.create(projectDbName, function (err) {
                        if (err) { return console.log('error creating new database ' + projectDbName + ': ', err); }

                        console.log('change: created new db: ', projectDbName);

                        // add role for all users in _users db
                        addRoleToUsersDb(_usersDb, doc.users, projectDbName);

                        // set up read permissions for these users
                        // create security doc
                        securityDoc     = createSecurityDoc(null, projectDbName, 'barbalex');
                        projectDbNameDb = nano.use(projectDbName);
                        projectDbNameDb.insert(securityDoc, '_security', function (err, body) {
                            if (err) { return console.log('error setting _security in new project DB: ', err); }
                            //console.log('answer from setting _security in new project DB: ', body);
                        });
                    });
                }
            } else {
                // an existing doc was changed
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // an existing project was changed
                    // if users were changed, update their roles in the _users database
                    

                }
            }
        }
    });
};