/*
 * removes all project databases that were only used by this user
 * - also stops listening to their changes
 * removes the user from all docs in project databases that are also used by other users
 */

'use strict'

var _ = require('underscore'),
  couchPassfile = require('../couchpass.json'),
  dbUrl = 'http://' + couchPassfile.user + ':' + couchPassfile.pass + '@127.0.0.1:5984',
  nano = require('nano')(dbUrl),
  deleteDatabase = require('./deleteDatabase')

module.exports = function (userName, projects) {
  var _userDb,
    otherUsersDocs,
    otherUserUsingProject

  // get all users roles
  _userDb = nano.use('_users')
  _userDb.list(function (err, body) {
    if (err) { return console.log('error getting users from _users db: ', err) }
    otherUsersDocs = _.map(body.rows, function (doc) {
      if (doc.name !== userName) {
        // leave out this user
        return doc
      }
    })
    _.each(projects, function (project) {
      // check if other user uses this project
      otherUserUsingProject = _.find(otherUsersDocs, function (doc) {
        return _.contains(doc.roles, project)
      })
      if (!otherUserUsingProject) {
        deleteDatabase(project)
      }
    })
  })
}
