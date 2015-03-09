/*
 * listens to changes in the _users db
 * handleUserChanges keeps user docs in the oi db in sync
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano              = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                 = require('underscore'),
    handleUserChanges = require('./handleUserChanges'),
    feed;

module.exports = function () {
    feed = nano.use('_users').follow({
        since:        'now',
        live:         true,
        include_docs: true
    });
    feed.on('change', handleUserChanges);
    feed.follow();
    // output result
    console.log('listening to changes of users');
};