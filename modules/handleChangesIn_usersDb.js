/*
 * When a users was changed,
 * TODO
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                       = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    usersDB                    = nano.use('_users'),
    oiDb                       = nano.use('oi'),
    removeUsersDocsAndProjects = require('./removeUsersDocsAndProjects'),
    deleteDatabase             = require('./deleteDatabase');

function insertUserToOiDb(user) {
    delete user._rev;
    delete user.salt;
    delete user.password_scheme;
    oiDb.insert(user, function (err, body) {
        if (err) { return console.log('error inserting changed userDoc to oiDb: ', err); }
    });
}

module.exports = function (change) {

    // check the revs
    usersDB.get(change.id, { revs: true, open_revs: 'all' }, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
            userDoc,
            userDbName,
            userName,
            userProjects;

        console.log('user change: ', change);

        // a new user was created, an existing changed or deleted
        userDoc = change.doc;

        if (change.deleted) {
            // user was deleted
            // TODO: delete userDb
            // get last doc version before deleted
            usersDB.get(change.id, { rev: revHash}, function (err, doc) {
                if (err) { return console.log('error getting userDoc version before deleted: ', err); }
                if (doc) {
                    // a user was deleted
                    userName     = doc.name;
                    userProjects = doc.roles;

                    // remove the role from all the users docs
                    // remove projects and their db's that only had this user
                    removeUsersDocsAndProjects(userName, userProjects);

                    // delete this user's database
                    userDbName = 'user_' + change.id;
                    deleteDatabase(userDbName);

                    // stop listening to changes
                    GLOBAL[userDbName].stop();
                }
            });
        } else {
            if (revisions.start === 1) {
                // a new user was created

                console.log('change: new user was created: ', userDoc.name);

                insertUserToOiDb(userDoc);
            } else {
                // an existing user was changed or deleted
                // update the user doc in oiDb
                oiDb.get(change.id, function (err, oiUserDoc) {
                    if (err) { return console.log('error getting user from oiDb: ', err); }
                    userDoc._rev = oiUserDoc._rev;
                    insertUserToOiDb(userDoc);
                });
            }
        }
    });
};