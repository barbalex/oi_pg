/*
 * Goal is:
 * - every user has a userDb
 * - it contains user specific information
 * - namely: a list of projects
 * - the userDb is synced to pouch
 * - when the app starts up, it get's a list of projects from the userDb
 * - and loads the projects data
 *
 * When a users userDoc was changed, it is changed in the userDb too
 * When a users userDoc was deleted:
 * - the user Db is deleted
 * - the users project-DB's too, if no other user was using them
 * - if so, the user is removed from all docs .users field
 * When a new user is created:
 * - a userDb is created
 * - with exclusive rights
 * - the _users userDoc is added to the userDb
 * - oi_pg starts listening to changes in the userDb
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                       = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                          = require('underscore'),
    _usersDb                   = nano.use('_users'),
    removeUsersDocsAndProjects = require('./removeUsersDocsAndProjects'),
    deleteDatabase             = require('./deleteDatabase'),
    listenToChangesInUsersDbs  = require('./listenToChangesInUsersDbs');

module.exports = function (change) {

    // check the revs
    _usersDb.get(change.id, { revs: true, open_revs: 'all' }, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
            userDoc,
            userDbName,
            userName,
            userProjects;

        console.log('user change: ', change);

        // a new user was created, an existing changed or deleted
        if (change.deleted) {
            // user was deleted > no doc in change
            // get last doc version before deleted to know the user.name and user.roles
            _usersDb.get(change.id, { rev: revHash}, function (err, doc) {
                if (err) { return console.log('error getting userDoc version before deleted: ', err); }
                if (doc) {
                    // a user was deleted
                    userName     = doc.name;
                    userProjects = doc.roles;
                    userDbName = 'user_' + doc.name.replace('@', '__at__').replace('.', '__p__');

                    // remove the role from all the users docs
                    // remove projects and their db's that only had this user
                    removeUsersDocsAndProjects(userName, userProjects);

                    // delete this user's database
                    deleteDatabase(userDbName);

                    // stop listening to changes
                    if (GLOBAL[userDbName]) { GLOBAL[userDbName].stop(); }
                }
            });
        } else {
            userDoc    = change.doc;
            userName   = userDoc.name;
            userDbName = 'user_' + userName.replace('@', '__at__').replace('.', '__p__');
            // get list of all databases
            nano.db.list(function (error, dbNames) {
                var securityDoc,
                    userDb;

                if (error) { return console.log('error getting list of dbs'); }
                //console.log('dbs: ', body);
                if (_.indexOf(dbNames, userDbName) === -1) {
                    // a new user was created
                    // create a new user db

                    console.log('created new user: ', userName);

                    nano.db.create(userDbName, function (err) {
                        if (err) { return console.log('error creating new user database ' + userDbName + ': ', err); }

                        console.log('created new user db: ', userDbName);

                        userDb = nano.use(userDbName);
                        // set up read permissions for the user
                        // create security doc
                        securityDoc               = {};
                        securityDoc.admins        = {};
                        securityDoc.admins.names  = [];
                        securityDoc.admins.roles  = [];
                        securityDoc.members       = {};
                        securityDoc.members.names = [userName];
                        securityDoc.members.roles = [];
                        userDb.insert(securityDoc, '_security', function (err, body) {
                            if (err) { return console.log('error setting _security in new user DB: ', err); }
                            //console.log('answer from setting _security in new user DB: ', body);
                        });

                        // add the user as doc, without rev
                        delete userDoc._rev;
                        userDb.insert(userDoc, function (err, body) {
                            if (err) { return console.log('error adding user doc to new user DB ' + userDbName + ': ', err); }
                            //console.log('answer from adding user doc to new user DB: ', body);
                        });

                        // start listening to changes
                        listenToChangesInUsersDbs([userDbName]);
                    });
                } else {
                    // an existing user was changed
                    // update the user doc in the users db
                    userDb = nano.use(userDbName);
                    userDb.get(change.id, function (err, userdbUserDoc) {
                        if (err) { return console.log('error getting user from userDb ' + userDbName + ': ', err); }
                        userDoc._rev = userdbUserDoc._rev;
                        userDb.insert(userDoc, function (err, body) {
                            if (err) { return console.log('error inserting changed userDoc to userDb ' + userDbName + ': ', err); }
                        });
                    });
                }
            });
        }
    });
};