#!/usr/bin/env node

// Utility to post images

var optparse = require('optparse');
var redis = require("redis");
var redis_client = redis.createClient(null, null, { return_buffers: true });
var fs = require('fs');
var _ = require('underscore');
var async = require('async');

var switches = [
  ['--date YYYY-MM-DD', 'The date of the image'],
  ['--device DEVICE', 'The device ID']
];

var options = {
};

var parser = new optparse.OptionParser(switches);

parser.on('date', function(name, value) {
  options['date'] = value;
});

parser.on('device', function(name, value) {
  options['device'] = value;
});

parser.parse(process.argv);

function dumpData(options, callback) {

  redis_client.keys('*', function (err, all_keys) {
    async.series(_.map(all_keys, function(key) {
      return function(callback) {
        redis_client.get(key, function (err, data) {
          fs.writeFile("dump/" + key, data, function(err) {
            callback(err);
          });
        });
      }
    }), function(err, results) {
      callback(err);
    });
  });
}

dumpData(options, function(err) { process.exit(0); } );