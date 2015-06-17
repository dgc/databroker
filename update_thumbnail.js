#!/bin/env node

// Utility to post images

var optparse = require('optparse');
var redis = require("redis");
var redis_client = redis.createClient(null, null, { return_buffers: true });
var fs = require('fs');
var dateFormat = require('dateformat');
var _ = require('underscore');
var exec = require('child_process').exec;

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

redis_client.get(options['date'] + ' ' + options['device'], function (err, data) {

  var tsv = "";

  _.each(JSON.parse(data), function (row) {

    var timestamp = new Date(row['timestamp'] * 1000);
    var date = dateFormat(timestamp, 'yyyy/mm/dd HH:MM:ss');

    tsv += date + "\t" + 
      (row['10-000802b42b40'] / 1000) + "\t" +
      (row['10-000802b44f21'] / 1000) + "\t" +
      (row['10-000802b49201'] / 1000) + "\t" +
      (row['10-000802b4b181'] / 1000) + "\t" +
      "\n";
  });

  fs.writeFileSync('data.tsv', tsv);

  exec('gnuplot data.gnu', function (error, stdout, stderr) {

    var image = fs.readFileSync('output.png');

    var key = 'thumbnail ' + options['date'] + ' ' + options['device'];

    redis_client.set(key, image);
    process.exit(0);
  });
});
