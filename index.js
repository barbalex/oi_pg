/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    oiDb = nano.use('oi'),
    _    = require('underscore'),
    feed = oiDb.follow({since: 'now'});

feed.on('change', function (change) {
    console.log('change: ', change);
});

feed.follow();