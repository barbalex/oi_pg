/*
 * gets an array of user dbs
 * starts listening to them
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                  = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                     = require('underscore'),
    handleChangesInUserDb = require('./handleChangesInUserDb'),
    feed;

module.exports = function (userDbs) {
    // start listening to changes in all project-dbs
    _.each(userDbs, function (userDb) {
        feed = nano.use(userDb).follow({
            //since:        'now',
            live:         true,
            include_docs: true
        });
        feed.on('change', function (change) {
            handleChangesInUserDb(nano.use(userDb), change);
        });
        feed.follow();
        // give the feed a name so it can later be stopped
        feed = GLOBAL[userDb];
        // output result
        console.log('listening to changes in userDb ', userDb);
    });
};