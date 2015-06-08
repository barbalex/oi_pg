/*
 * when message doc changes
 * - analyse type
 * - do it
 * - remove message doc
 */

'use strict'

var couchPassfile = require('../couchpass.json'),
  dbUrl = 'http://' + couchPassfile.user + ':' + couchPassfile.pass + '@127.0.0.1:5984',
  nano = require('nano')(dbUrl),
  createProjectDb = require('./createProjectDb')

module.exports = function (change) {
  var changeDoc = change.doc,
    oiDb = nano.use('oi_messages')

  switch (changeDoc.type) {
    case 'projectAdd':
      createProjectDb(changeDoc.projectName)
      // now delete the message
      oiDb.destroy(changeDoc, changeDoc._rev, function (error) {
        if (error) { return console.log('error removing doc after ordering to create project', error) }

        console.log('removed doc after ordering to create project', changeDoc)
      })
      break
  }
}
