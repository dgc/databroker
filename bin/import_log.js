#!/usr/bin/env node

// Utility to import logs

var optparse = require('optparse');
var storage = require('../lib/storage.js');
var fs = require('fs');
var dateFormat = require('dateformat');
var _ = require('underscore');
var async = require('async');
var sprintf = require('sprintf-js').sprintf;

var switches = [
  ['--date YYYY-MM-DD', 'The date of the image'],
  ['--device DEVICE', 'The device ID'],
  ['--file FILE', 'The log file to import']
];

var options = {
  date: "????-??-??"
};

var parser = new optparse.OptionParser(switches);

parser.on('date', function(name, value) {
  options['date'] = value;
});

parser.on('device', function(name, value) {
  options['device'] = value;
});

parser.on('file', function(name, value) {
  options['file'] = value;
});

parser.parse(process.argv);

if (options['device'] == undefined)
  throw "No device ID.";

if (options['file'] == undefined)
  throw "No file.";

function processLog(options, callback) {

  var pattern = options['date'] + ' ' + options['device'];

  fs.readFile('conf/conf.json', 'utf8', function (err, configuration_text) {

    if (err)
      throw err;

    var configuration = JSON.parse(configuration_text);

    fs.readFile(options['file'], function(err, import_text) {

      if (err)
        throw err;

      var import_lines = import_text.toString().split("\n");

      var days = {};

      for (i in import_lines) {

        try {
          console.log(import_lines[i]);
          var data = JSON.parse(import_lines[i]);

          var date = new Date(parseInt(data['timestamp'], 10) * 1000);

          var base = sprintf('%02d-%02d-%02d', date.getFullYear(),
            date.getMonth() + 1, date.getDate());

          var key = base + " " + options['device'];

          if (days[base] == undefined)
            days[base] = [];

          days[base].push(data);

        } catch (err) {

          if (import_lines[i].trim() != "") {
            console.log(err);
          }
        }
      }

      async.series(_.map(_.keys(days), function (base) {
        return function(callback) {
          var key = base + " " + options['device'];

          storage.get(key, function(err, entries) {

            if (entries === undefined) {
              entries = [];
            } else {
              entries = JSON.parse(entries);
            }

            var timestamps = {};

            _.each(entries, function (entry) {
              if (entry["timestamp"]) {
                timestamps[entry["timestamp"]] = 1;
              }
            });

            _.each(days[base], function (entry) {
              if (timestamps[entry["timestamp"]] == null) {
                entries.push(entry);
              }
            });

            entries = entries.sort(function (a, b) {
              return a["timestamp"] - b["timestamp"];
            });

            storage.set(key, JSON.stringify(entries));
            callback(err);
          });
        };
      }), function (err, results) {
        callback();
      });
    });
  });
}

processLog(options, function(err) { process.exit(0); } );
