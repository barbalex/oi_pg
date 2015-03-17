/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                       = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                          = require('underscore'),
    listenToChangesInMessageDb = require('./modules/listenToChangesInMessageDb'),
    listenToChangesIn_usersDb  = require('./modules/listenToChangesIn_usersDb'),
    listenToDbChanges          = require('./modules/listenToDbChanges');

// list all db's
nano.db.list(function (error, dbs) {
    if (error) { return console.log('error getting DBs: ', error); }

    var projectDbs,
        userDbs;

    //console.log('dbs gotten: ', dbs);

    // filter all project-db's
    projectDbs = _.filter(dbs, function (db) {
        return db.substr(0, 8) === 'project_';
    });

    userDbs = _.filter(dbs, function (db) {
        return db.substr(0, 5) === 'user_';
    });

    listenToChangesInMessageDb(projectDbs);
    listenToChangesIn_usersDb();
    //listenToDbChanges();
});