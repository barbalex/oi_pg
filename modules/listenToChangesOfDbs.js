/*
 * gets an array of dbs
 * starts listening to them
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                     = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                        = require('underscore'),
    handleProjectChangesInDb = require('./handleProjectChangesInDb'),
    feed;

module.exports = function (projectDbs) {
    // start listening to changes in all project-dbs
    _.each(projectDbs, function (projectDb) {
        feed = nano.use(projectDb).follow({
            since:        'now',
            live:         true,
            include_docs: true
        });
        feed.on('change', function (change) {
            handleProjectChangesInDb(nano.use('projectDb'), change);
        });
        feed.follow();
        // give the feed a name so it can later be stopped
        feed = GLOBAL[projectDb];
        // output result
        console.log('listning to changes in ', projectDb);
    });
};