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
 * When a new user is created:
 * - a userDb is created
 * - with exclusive rights
 * - the _users userDoc is added to the userDb
 * - oi_pg starts listening to changes in the userDb
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                      = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                         = require('underscore'),
    _usersDb                  = nano.use('_users'),
    removeUsersProjectDbs     = require('./removeUsersProjectDbs'),
    deleteDatabase            = require('./deleteDatabase'),
    listenToChangesInUsersDbs = require('./listenToChangesInUsersDbs'),
    createSecurityDoc         = require('./createSecurityDoc');

module.exports = function (change) {

    console.log('handleChangesIn_usersDb: change: ', change);

    // check the revs
    _usersDb.get(change.id, { revs: true, open_revs: 'all' }, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
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
            _usersDb.get(change.id, { rev: revHash}, function (err, doc) {
                if (err) { return console.log('error getting userDoc version before deleted: ', err); }
                if (doc) {
                    // a user was deleted
                    userName     = doc.name;
                    userProjects = doc.roles;
                    userDbName = 'user_' + doc.name.toLowerCase().replace('@', '_at_').replace('.', '_p_');

                    // remove the role from all the users docs
                    // remove projects and their db's that only had this user
                    removeUsersProjectDbs(userName, userProjects);

                    // delete this user's database
                    deleteDatabase(userDbName);

                    // stop listening to changes to userDb
                    if (GLOBAL[userDbName]) { GLOBAL[userDbName].stop(); }

                    // remove user from members of message db
                    messageDb.get('_security', function (error, doc) {
                        if (error) { console.log('error getting _security of message db: ', error); }
                        doc.members.names = _.without(doc.members.names, userName);
                    });
                }
            });
        } else {
            userDoc    = change.doc;
            userName   = userDoc.name;
            userDbName = 'user_' + userName.toLowerCase().replace('@', '_at_').replace('.', '_p_');
            // get list of all databases
            nano.db.list(function (error, dbNames) {
                var securityDoc,
                    userDb;

                if (error) { return console.log('error getting list of dbs'); }
                //console.log('dbs: ', body);
                if (_.indexOf(dbNames, userDbName) === -1) {
                    // a new user was created
                    // create a new user db
                    nano.db.create(userDbName, function (err) {
                        if (err) { return console.log('error creating new user database ' + userDbName + ': ', err); }

                        console.log('created new user db: ', userDbName);

                        userDb = nano.use(userDbName);
                        // set up read permissions for the user
                        // create security doc
                        securityDoc = createSecurityDoc(userName, null, 'barbalex');
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
                }/* else {
                    // an existing user was changed
                    // update the user doc in the users db
                    // no, don't: users are changed in userDb's, not in _users db
                    // if we change here, the change listener for the userDb will be called
                    userDb = nano.use(userDbName);
                    userDb.get(change.id, function (err, userdbUserDoc) {
                        if (err) { return console.log('error getting user from userDb ' + userDbName + ': ', err); }
                        userDoc._rev = userdbUserDoc._rev;
                        userDb.insert(userDoc, function (err, body) {
                            if (err) { return console.log('error inserting changed userDoc to userDb ' + userDbName + ': ', err); }
                            console.log('updated userDB of user: ', userDbName);
                        });
                    });
                }*/
            });
        }
    });
};