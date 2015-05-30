/*
 * when a db is deleted
 * - if there is an active change listener this will be stopped
 * - if it was a user db, it's userDoc's last roles are removed from the _users doc
 *   and the corresponding projectDb's removed if no other user uses them
 */

'use strict'

var nano = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
  _ = require('underscore'),
  _usersDb = nano.use('_users'),
  getUserDbName = require('./getUserDbName'),
  removeUsersProjectDbs = require('./removeUsersProjectDbs')

module.exports = function (change) {
  // console.log('handleDbChanges: db change: ', change)

  var isUserDb,
    dbName,
    projects,
    userName

  dbName = change.db_name
  isUserDb = dbName.substring(0, 5) === 'user_'

  // console.log('handleDbChanges: isUserDb: ', isUserDb)
  // console.log('handleDbChanges: dbName: ', dbName)

  if (change.type === 'deleted') {
    console.log('handleDbChanges: db change: ', change)

    if (GLOBAL[dbName]) {
      console.log('handleDbChanges: Removing feed following changes in ' + dbName)
      // stop feed following the db
      GLOBAL[dbName].stop()
    }
    if (isUserDb) {
      // if isUserDb remove user roles from _users db
      // find user in _users
      _usersDb.list({include_docs: true}, function (error, body) {
        if (error) { return console.log('error getting list of _users: ', error) }

        var userRow,
          userDoc

        userRow = _.find(body.rows, function (row) {
          // there seems to be a design doc in the _users db
          // return only docs with id beginning with org.couchdb.user:
          if (row.id.substring(0, 17) === 'org.couchdb.user:') {
            return getUserDbName(row.doc.name) === dbName
          }
        })
        if (userRow) {
          userDoc = userRow.doc
        }
        if (userDoc) {
          // console.log('handleDbChanges: userDoc:', userDoc)

          projects = userDoc.roles
          userName = userDoc.name
          userDoc.roles = []
          // pass global to handleChangesIn_usersDb as marker to not recreate userDb
          GLOBAL.deleteUserDb = true
          _usersDb.insert(userDoc, function (error) {
            if (error) { return console.log('handleDbChanges: error inserting userDoc:', error) }
          })
          // remove all the user's projectDb's
          if (userName && projects) {
            removeUsersProjectDbs(userName, projects)
          }
        }
      })
    }
  }
}
