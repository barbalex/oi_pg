/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                     = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    usersDB                  = nano.use('_users'),
    _                        = require('underscore'),
    handleProjectChangesInDb = require('./modules/handleProjectChangesInDb'),
    feed;

// list all db's
nano.db.list(function (error, dbs) {
    if (error) { return console.log('error getting DBs: ', error); }

    console.log('dbs gotten: ', dbs);

    // filter all project-db's
    var projectDbs = _.filter(dbs, function(db) {
        return db.substr(0, 8) === 'project_';
    });

    console.log('projectDbs: ', projectDbs);

    // start listening to changes in all project-dbs
    _.each(projectDbs, function (projectDb) {
        feed = nano.use('projectDb').follow({
            since:        'now',
            live:         true,
            include_docs: true
        });
        feed.on('change', function (change) {
            handleProjectChangesInDb(nano.use('projectDb'), change);
        });
        feed.follow();
    });

});





        