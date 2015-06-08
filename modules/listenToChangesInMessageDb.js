/*
 * listens to changes in the oi_messages db
 */

'use strict'

var couchPassfile = require('../couchpass.json'),
  dbUrl = 'http://' + couchPassfile.user + ':' + couchPassfile.pass + '@127.0.0.1:5984',
  nano = require('nano')(dbUrl),
  handleChangesInMessageDb = require('./handleChangesInMessageDb')

module.exports = function () {
  var feed

  if (!GLOBAL.oi_messages) {
    feed = nano.use('oi_messages').follow({
      since: 'now',
      live: true,
      include_docs: true
    })
    feed.on('change', handleChangesInMessageDb)
    feed.follow()
    GLOBAL.oi_messages = feed
    // output result
    console.log('listening to changes in oi_messages')
  }
}
