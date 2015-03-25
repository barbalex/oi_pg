/*
 * when message doc changes
 * - analyse type
 * - do it
 */

/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano            = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    createProjectDb = require('./createProjectDb');

module.exports = function (change) {
    var changeDoc = change.doc;

    switch (changeDoc.type) {
    case 'projectAdd':
        createProjectDb(changeDoc.projectName);
        break;
    }
};