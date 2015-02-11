/*jslint node: true, browser: true, nomen: true, todo: true */
'use strict';

var nano = require('nano')('http://barbalex:dLhdMg12@127.0.0.1:5984'),
    oiDb = nano.use('oi'),
    _    = require('underscore'),
    feed = oiDb.follow({
        since:        'now',
        live:         true,
        include_docs: true
    });

feed.on('change', function (change) {
    //console.log('change: ', change);
    // check the revs
    oiDb.get(change.id, { revs: true, open_revs: 'all'}, function (err, body) {
        if (err) { return console.log('error getting revs of doc: ', err); }

        var revisions = body[0].ok._revisions,
            revHash   = revisions.start - 1 + '-' + revisions.ids[1],
            doc;

        if (change.deleted) {
            // a doc was deleted
            // get last doc version before deleted
            oiDb.get(change.id, { rev: revHash}, function (err, body) {
                doc = body;
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // a project was deleted
                    // delete this project's database
                    nano.db.destroy('project_' + change.id, function (err, body) {
                        if (err) { return console.log('error deleting database project_' + change.id + ': ', err); }

                        console.log('deleted database project_' + change.id);

                    });
                }
            });
        } else {
            // a new doc was created or an existing changed
            doc = change.doc;
            if (revisions.start === 1) {
                // a new doc was created
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // a new project was created

                    console.log('new project created');

                    // create a new database for id
                    nano.db.create('project_' + change.id, function (err) {
                        if (err) { return console.log('error creating new database project_', err); }

                        console.log('created database project_' + change.id);

                    });
                }
            } else {
                // an existing doc was changed
                if (doc && doc.type && doc.type === 'object' && !doc.parent) {
                    // an existing project was changed
                    // if users were changed, update them in the projects database
                    oiDb.get(change.id, { rev: revHash}, function (err, oldDoc) {
                        if (oldDoc.users && doc.users && oldDoc.users !== doc.users) {
                            // users were changed
                            // TODO: update users in project's database

                        }
                    });

                }
            }
        }
    });
});

feed.follow();