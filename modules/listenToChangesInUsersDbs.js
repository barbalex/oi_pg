/*
 * gets an array of user dbs
 * starts listening to them
 */

'use strict'

var couchPassfile = require('../couchpass.json'),
  dbUrl = 'http://' + couchPassfile.user + ':' + couchPassfile.pass + '@127.0.0.1:5984',
  nano = require('nano')(dbUrl),
  _ = require('underscore'),
  handleChangesInUserDb = require('./handleChangesInUserDb')

module.exports = function (userDbs) {
  var feed

  // start listening to changes in all project-dbs
  _.each(userDbs, function (userDb) {
    // make sure the feed does not exist yet
    if (!GLOBAL[userDb]) {
      feed = nano.use(userDb).follow({
        since: 'now',
        live: true,
        include_docs: true
      })
      feed.on('change', function (change) {
        handleChangesInUserDb(nano.use(userDb), change)
      })
      feed.follow()
      // give the feed a name so it can later be stopped
      GLOBAL[userDb] = feed
      // output result
      console.log('listening to changes in', userDb)
    }
  })
}
