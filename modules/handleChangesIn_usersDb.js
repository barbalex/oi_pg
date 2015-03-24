/*
 * when a new user signs up,
 * a new userDb is created
 * and listening to it's changes started
 * 
 * when a user is deleted,
 * his projectDb's are removed,
 * if no other user uses them
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                      = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                         = require('underscore'),
    $                         = require('jquery'),
    _usersDb                  = nano.use('_users'),
    removeUsersProjectDbs     = require('./removeUsersProjectDbs'),
    deleteDatabase            = require('./deleteDatabase'),
    listenToChangesInUsersDbs = require('./listenToChangesInUsersDbs'),
    createSecurityDoc         = require('./createSecurityDoc'),
    getUserDbName             = require('./getUserDbName'),
    updateUserDoc             = require('./updateUserDoc');

module.exports = function (change) {

    //console.log('handleChangesIn_usersDb: change: ', change);

    // check the revs
    _usersDb.get(change.id, { revs: true, open_revs: 'all' }, function (error, body) {
        if (error) { return console.log('handleChangesIn_usersDb: error getting revs of doc: ', error); }

        var revisions   = body[0].ok._revisions,
            revOfOldDoc = revisions.start - 1 + '-' + revisions.ids[1],
            userDoc,
            userDbName,
            userName,
            userProjects,
            messageDb;

        messageDb = nano.use('oi_messages');

        // a new user was created, an existing changed or deleted
        if (change.deleted) {
            // user was deleted > no doc in change
            // get last doc version before deleted to know the user.name and user.roles
            _usersDb.get(change.id, { rev: revOfOldDoc}, function (error, doc) {
                if (error) {
                    if (error.statusCode === 404) {
                        // could not get previous version - this is expected if user was created new before
                        return true;
                    }
                    return console.log('handleChangesIn_usersDb: error getting userDoc version before deleted: ', error);
                }
                if (doc) {
                    // a user was deleted
                    userName     = doc.name;
                    userProjects = doc.roles;
                    userDbName   = getUserDbName(doc.name);

                    // remove the role from all the users docs
                    // remove projects and their db's that only had this user
                    removeUsersProjectDbs(userName, userProjects);

                    // delete this user's database
                    deleteDatabase(userDbName);

                    // stop listening to changes to userDb
                    if (GLOBAL[userDbName]) {
                        GLOBAL[userDbName].stop();
                        console.log('handleChangesIn_usersDb: stopped listening to feed of ' + userDbName);
                    }

                    // remove user from members of message db
                    messageDb.get('_security', function (error, doc) {
                        if (error) { console.log('handleChangesIn_usersDb: error getting _security of message db: ', error); }
                        doc.members.names = _.without(doc.members.names, userName);
                    });
                }
            });
        } else {
            // PROBLEM: userDb gets created when userDb was removed,
            // because the roles are then removed from _users db
            // solution: handleDbChanges passes GLOBAL.deleteUserDb
            if (GLOBAL.deleteUserDb) {
                return delete GLOBAL.deleteUserDb;
            }

            userDoc    = change.doc;
            userName   = userDoc.name;
            userDbName = getUserDbName(userName);
            // get list of all databases
            nano.db.list(function (error, dbNames) {
                if (error) { return console.log('handleChangesIn_usersDb: error getting list of dbs'); }

                var securityDoc,
                    userDb;

                if (_.indexOf(dbNames, userDbName) === -1) {
                    // this user has no uderDb yet
                    // a new user was created
                    // create a new user db
                    nano.db.create(userDbName, function (error) {
                        if (error) { return console.log('handleChangesIn_usersDb: error creating new user database ' + userDbName + ': ', error); }

                        console.log('handleChangesIn_usersDb: created new user db: ', userDbName);

                        userDb = nano.use(userDbName);
                        // set up read permissions for the user
                        // create security doc
                        securityDoc = createSecurityDoc(userName, null, 'barbalex');
                        userDb.insert(securityDoc, '_security', function (error) {
                            if (error) { return console.log('handleChangesIn_usersDb: error setting _security in new user DB: ', error); }
                        });
                        // add the user as doc, without rev and some other fields
                        delete userDoc._rev;
                        delete userDoc.salt;
                        delete userDoc.derived_key;
                        delete userDoc.iterations;
                        delete userDoc.password_scheme;

                        //console.log('userDoc: ', userDoc);

                        userDb.insert(userDoc, function (error) {
                            if (error) { return console.log('handleChangesIn_usersDb: error adding user doc to new user DB ' + userDbName + ': ', error); }
                            // start listening to changes
                            listenToChangesInUsersDbs([userDbName]);
                        });

                        // if new userDoc already has roles, create project db's
                        if (userDoc.roles.length > 0) {
                            var userDocOld = $.extend({}, userDoc);
                            userDocOld.roles = [];
                            updateUserDoc(userDoc, userDocOld);
                        }
                    });
                }
            });
        }
    });
};