/*
 * listens to changes in the _users db
 * handleChangesIn_usersDb keeps user docs in the oi db in sync
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                    = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                       = require('underscore'),
    handleChangesIn_usersDb = require('./handleChangesIn_usersDb');

module.exports = function () {
    var feed;

    if (!GLOBAL._users) {
        feed = nano.use('_users').follow({
            since:        'now',
            live:         true,
            include_docs: true
        });
        feed.on('change', handleChangesIn_usersDb);
        feed.follow();
        GLOBAL._users = feed;
        // output result
        console.log('listening to changes in _users');
    }
};