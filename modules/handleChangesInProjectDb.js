/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                        = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    usersDB                     = nano.use('_users'),
    _                           = require('underscore'),
    removeRoleFromUsersDb       = require('./removeRoleFromUsersDb'),
    addRoleToUsersDb            = require('./addRoleToUsersDb'),
    listenToChangesInProjectDbs = require('./listenToChangesInProjectDbs'),
    deleteDatabase              = require('./deleteDatabase');

module.exports = function (projectDb, change) {
    // check the revs
    projectDb.get(change.id, { revs: true, open_revs: 'all' }, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
            doc,
            projectDbName,
            projectDbNameDb,
            securityDoc;

        console.log('change: ', change);

        if (change.deleted) {
            // a doc was deleted
            // get last doc version before deleted
            projectDb.get(change.id, { rev: revHash}, function (err, body) {
                if (err) { return console.log('error getting doc version before deleted: ', err); }
                doc = body;
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // a project was deleted
                    // delete this project's database
                    projectDbName = 'project_' + change.doc.name;
                    deleteDatabase(projectDbName);

                    // remove the role from all the users userDocs
                    removeRoleFromUsersDb(usersDB, doc.users, projectDbName);

                    // stop listening to changes
                    GLOBAL[projectDbName].stop();
                }
            });
        } else {
            // a new doc was created or an existing changed
            doc = change.doc;
            if (revisions.start === 1) {
                // a new doc was created
                if (doc && doc.type && doc.type === 'object' && !doc.parent && doc.name) {
                    // a new project was created

                    //console.log('change: new project was created');

                    // create a new database for the project
                    projectDbName = 'project_' + doc.name;
                    nano.db.create(projectDbName, function (err) {
                        if (err) {
                            if (err.statusCode === 412) {
                                // database already exists
                                return null;
                            }
                            return console.log('error creating new database ' + projectDbName + ': ', err);
                        }

                        console.log('change: created new db: ', projectDbName);

                        // add role for all users in _users db
                        addRoleToUsersDb(usersDB, doc.users, projectDbName);

                        // set up read permissions for these users
                        // create security doc
                        securityDoc               = {};
                        securityDoc.admins        = {};
                        securityDoc.admins.names  = [];
                        securityDoc.admins.roles  = [];
                        securityDoc.members       = {};
                        securityDoc.members.names = [];
                        securityDoc.members.roles = [projectDbName];
                        projectDbNameDb = nano.use(projectDbName);
                        projectDbNameDb.insert(securityDoc, '_security', function (err, body) {
                            if (err) { return console.log('error setting _security in new project DB: ', err); }
                            //console.log('answer from setting _security in new project DB: ', body);
                        });

                        // start listening to changes
                        listenToChangesInProjectDbs([projectDbName]);
                    });
                }
            } else {
                // an existing doc was changed
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // an existing project was changed
                    // if users were changed, update their roles in the _users database
                    projectDb.get(change.id, { rev: revHash}, function (err, oldDoc) {
                        if (err) { return console.log('error getting doc version before changed: ', err); }
                        var usersToAddRole,
                            usersToRemoveRole,
                            roleName;

                        if (oldDoc.users && doc.users && oldDoc.users !== doc.users) {
                            // users were changed
                            roleName = 'project_' + doc._id;
                            // update users roles in _users database
                            // find users to add a role = users that have been added
                            usersToAddRole = _.without(doc.users, oldDoc.users);
                            if (usersToAddRole.length > 0) {
                                addRoleToUsersDb(usersDB, usersToAddRole, roleName);
                            }
                            // find users to remove a role = users that have been removed
                            usersToRemoveRole = _.without(oldDoc.users, doc.users);
                            if (usersToAddRole.length > 0) {
                                removeRoleFromUsersDb(usersDB, usersToRemoveRole, roleName);
                            }
                        }
                    });

                }
            }
        }
    });
};