/*
 * gets names and / or roles and maybe an admin
 * returns a security doc
 * allowing write to passed names and / or roles
 * plus admin for admin or if no admin was passed, couchPassfile.user
 * so users with the role can't change design docs
 */

'use strict'

var couchPassfile = require('../couchpass.json')

module.exports = function (names, roles, admin) {
  var securityDoc

  admin = admin || couchPassfile.user
  securityDoc = {
    admins: {
      names: [admin],
      roles: []
    },
    members: {
      names: [],
      roles: []
    }
  }

  if (names) {
    securityDoc.members.names.push(names)
  }
  if (roles) {
    securityDoc.members.roles.push(roles)
  }

  return securityDoc
}
