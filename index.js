'use strict'

var couchPassfile = require('./couchpass.json'),
  dbUrl = 'http://' + couchPassfile.user + ':' + couchPassfile.pass + '@127.0.0.1:5984',
  nano = require('nano')(dbUrl),
  _ = require('underscore'),
  listenToChangesIn_usersDb = require('./modules/listenToChangesIn_usersDb'),
  listenToChangesInUsersDbs = require('./modules/listenToChangesInUsersDbs'),
  listenToChangesInMessageDb = require('./modules/listenToChangesInMessageDb'),
  listenToDbChanges = require('./modules/listenToDbChanges')

// list all db's
nano.db.list(function (error, dbs) {
  if (error) { return console.log('error getting DBs: ', error) }

  var userDbs

  userDbs = _.filter(dbs, function (db) {
    return db.substr(0, 5) === 'user_'
  })

  listenToChangesIn_usersDb()
  listenToChangesInUsersDbs(userDbs)
  listenToChangesInMessageDb()
  listenToDbChanges()
})
