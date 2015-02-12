/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano    = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    usersDB = nano.use('_users'),
    oiDb    = nano.use('oi'),
    _       = require('underscore'),
    feed    = oiDb.follow({
        since:        'now',
        live:         true,
        include_docs: true
    });

function removeRoleFromUsersDb(users, roleName) {
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

}

function addRoleToUsersDb(users, roleName) {
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
}

feed.on('change', function (change) {
    // check the revs
    oiDb.get(change.id, { revs: true, open_revs: 'all' }, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
            doc,
            projectDbName,
            projectDbNameDb,
            securityDoc;

        if (change.deleted) {
            // a doc was deleted
            // get last doc version before deleted
            oiDb.get(change.id, { rev: revHash}, function (err, body) {
                if (err) { return console.log('error getting doc version before deleted: ', err); }
                doc = body;
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // a project was deleted
                    // delete this project's database
                    projectDbName = 'project_' + change.id;
                    nano.db.destroy(projectDbName, function (err) {
                        if (err) { return console.log('error deleting database ' + projectDbName + ': ', err); }
                        console.log('deleted database ' + projectDbName);
                    });

                    // remove the role from all the users userDocs
                    removeRoleFromUsersDb(doc.users, projectDbName);
                }
            });
        } else {
            // a new doc was created or an existing changed
            doc = change.doc;
            if (revisions.start === 1) {
                // a new doc was created
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // a new project was created
                    // create a new database for the project
                    projectDbName = 'project_' + change.id;
                    nano.db.create(projectDbName, function (err) {
                        if (err) { return console.log('error creating new database ' + projectDbName + ': ', err); }

                        // add role for all users in _users db
                        addRoleToUsersDb(doc.users, projectDbName);

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
                    });
                }
            } else {
                // an existing doc was changed
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // an existing project was changed
                    // if users were changed, update their roles in the _users database
                    oiDb.get(change.id, { rev: revHash}, function (err, oldDoc) {
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
                                addRoleToUsersDb(usersToAddRole, roleName);
                            }
                            // find users to remove a role = users that have been removed
                            usersToRemoveRole = _.without(oldDoc.users, doc.users);
                            if (usersToAddRole.length > 0) {
                                removeRoleFromUsersDb(usersToRemoveRole, roleName);
                            }
                        }
                    });

                }
            }
        }
    });
});

feed.follow();