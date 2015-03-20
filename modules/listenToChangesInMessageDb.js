/*
 * listens to changes in the oi_messages db
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                    = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                       = require('underscore'),
    handleChangesInMessageDb = require('./handleChangesInMessageDb');

module.exports = function () {
    var feed;

    if (!GLOBAL.oi_messages) {
        feed = nano.use('oi_messages').follow({
            since:        'now',
            live:         true,
            include_docs: true
        });
        feed.on('change', handleChangesInMessageDb);
        feed.follow();
        GLOBAL.oi_messages = feed;
        // output result
        console.log('listening to changes in oi_messages');
    }
};