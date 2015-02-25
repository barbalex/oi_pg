/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                 = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                    = require('underscore'),
    listenToChangesOfDbs = require('./modules/listenToChangesOfDbs'),
    feed;

// list all db's
nano.db.list(function (error, dbs) {
    if (error) { return console.log('error getting DBs: ', error); }

    console.log('dbs gotten: ', dbs);

    // filter all project-db's
    var projectDbs = _.filter(dbs, function (db) {
        return db.substr(0, 8) === 'project_';
    });

    console.log('projectDbs: ', projectDbs);

    listenToChangesOfDbs(projectDbs);
});