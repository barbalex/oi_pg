/*
 * listens to changes in the _users db
 * handleChangesIn_usersDb keeps user docs in the oi db in sync
 */

'use strict'

var couchPassfile = require('../couchpass.json'),
  dbUrl = 'http://' + couchPassfile.user + ':' + couchPassfile.pass + '@127.0.0.1:5984',
  nano = require('nano')(dbUrl),
  handleChangesIn_usersDb = require('./handleChangesIn_usersDb')

module.exports = function () {
  var feed

  if (!GLOBAL._users) {
    feed = nano.use('_users').follow({
      since: 'now',
      live: true,
      include_docs: true
    })
    feed.on('change', handleChangesIn_usersDb)
    feed.follow()
    GLOBAL._users = feed
    // output result
    console.log('listening to changes in _users')
  }
}
