/*
 * when userDoc changes
 * - get last version
 * - compare roles:
 *   - if roles were added: create projectDb's
 *   - if roles were removed: remove projectDb's if no other users use them
 *   - if roles have changed: update roles in _users db
 */

'use strict'

var _ = require('underscore'),
  createProjectDb = require('./createProjectDb'),
  updateUserDoc = require('./updateUserDoc')

module.exports = function (userDb, change) {
  var newDoc = change.doc

  // console.log('handleChangesInUserDb: newDoc: ', newDoc)

  // check the revs
  userDb.get(change.id, { revs_info: true }, function (error, doc) {
    if (error) { return console.log('error getting revs of doc: ', error); }

    var revisions = doc._revs_info,
      revOfOldDoc

    // console.log('handleChangesInUserDb: change: ', change)
      // console.log('handleChangesInUserDb: revisions: ', revisions)

    if (revisions.length === 1) {
      // this is a new user doc
      // there will be no roles yet
      // well, make shure
      if (newDoc.roles && newDoc.roles.length > 0) {
        _.each(newDoc.roles, function (roleAdded) {
          createProjectDb(roleAdded)
        })
        return console.log("new user doc, set it's roles")
      }
      return console.log('new user doc, not setting roles')
    }

    // get last version
    revOfOldDoc = revisions[1].rev
    userDb.get(change.id, { rev: revOfOldDoc }, function (error, oldDoc) {
      if (error) {
        if (error.statusCode === 404) {
          // old doc not found
          return updateUserDoc(newDoc, null)
        }
        return console.log('error getting last version of user doc: ', error)
      }

      // console.log('handleChangesInUserDb: oldDoc: ', oldDoc)

      // compare with last version
      if (oldDoc && oldDoc.roles && newDoc.roles && oldDoc.roles !== newDoc.roles) {
        // roles have changed
        // always update roles in _users DB
        updateUserDoc(newDoc, oldDoc)
      }

    // TODO: make shure other changes to userDoc are copied to _users doc
    })
  })
}
