/*
 * removes all project databases that were only used by this user
 * - also stops listening to their changes
 * removes the user from all docs in project databases that are also used by other users
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var _              = require('underscore'),
    nano           = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    deleteDatabase = require('./deleteDatabase');

module.exports = function (userName, projects) {
    var dbNames,
        db,
        docs,
        projectDoc;

    dbNames = _.map(projects, function (project) {
        return 'project_' + project;
    });

    _.each(dbNames, function (dbName) {
        db = nano.use(dbName);
        db.list(function (err, body) {
            if (err) { return console.log('error getting docs of DB ' + dbName + ': ', err); }
            docs = _.map(body.rows, function (doc) {
                return doc;
            });
            projectDoc = _.find(docs, function (doc) {
                return doc._id === doc.projId;
            });
            if (projectDoc && projectDoc.users) {
                if (_.indexOf(projectDoc.users, userName) > -1) {
                    if (projectDoc.users.length === 1) {
                        // delete DB
                        deleteDatabase(dbName);
                        // stop listening to changes
                        GLOBAL[dbName].stop();
                    } else {
                        // remove user from all docs
                        _.each(docs, function (doc) {
                            if (doc.users) {
                                doc.users = _.without(doc.users, userName);
                            }
                        });
                        // bulk update
                        db.bulk(dbName, { docs: docs }, function (err, response) {
                            if (err) {
                                return console.log('error removing user ' + userName + ' from .users field in all docs in DB ' + dbName + ': ', err);
                            }
                        });
                    }
                } else {
                    return console.log('error removing user ' + userName + ' from DB ' + dbName + ': User is not listed as user in project doc');
                }
            } else {
                return console.log('error getting docs of DB ' + dbName + ': no project doc found or it contains no users');
            }
        });
    });
};