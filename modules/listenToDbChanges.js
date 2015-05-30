/*
 * listens to changes in the couch instance
 * goal: know when a db was added
 */

'use strict'

var nano = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
  handleDbChanges = require('./handleDbChanges')

module.exports = function () {
  var feed

  if (!GLOBAL.dbUpdates) {
    feed = nano.followUpdates({since: 'now'})
    feed.on('change', handleDbChanges)
    feed.follow()
    GLOBAL.dbUpdates = feed
    console.log("listening to changes in db's")
  }
}
