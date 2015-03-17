/*
 * listens to changes in the couch instance
 * goal: know when a db was added
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano                     = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    _                        = require('underscore'),
    handleChangesInProjectDb = require('./handleChangesInProjectDb'),
    feed;

module.exports = function () {
    feed = nano.followUpdates({since: 'now'});
    feed.on('change', function (change) {
        console.log('db change: ', change);
    });
    feed.follow();
    console.log('listening to db changes');
};