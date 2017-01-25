#!/bin/env node

// Utility to post images

var optparse = require('optparse');
var storage = require('../lib/storage.js');
var fs = require('fs');
var dateFormat = require('dateformat');
var _ = require('underscore');
var async = require('async');
var updateThumbnail = require('./lib/update_thumbnail');

var switches = [
  ['--date YYYY-MM-DD', 'The date of the image'],
  ['--device DEVICE', 'The device ID'],
  ['--size SIZE', 'The size of the image']
];

var options = {
  size: undefined
};

var parser = new optparse.OptionParser(switches);

parser.on('size', function(name, value) {
  options['size'] = value;
});

parser.on('date', function(name, value) {
  options['date'] = value;
});

parser.on('device', function(name, value) {
  options['device'] = value;
});

parser.parse(process.argv);

if (options['device'] == undefined)
  throw "No device ID.";

function updateThumbnails(options, callback) {

  var pattern = options['date'] + ' ' + options['device'];

  fs.readFile('conf/conf.json', 'utf8', function (err, configuration_text) {

    if (err)
      throw err;

    var configuration = JSON.parse(configuration_text);

    storage.keys(pattern, function (err, thumbnail_keys) {
      async.series(_.map(thumbnail_keys, function(key) {
        return function(callback) {
          updateThumbnail(options['device'], key.toString('utf-8').substring(0, 10), configuration, callback);
        }
      }), function(err, results) {
        callback(err);
      });
    });
  });
}

updateThumbnails(options, function(err) { process.exit(0); } );
