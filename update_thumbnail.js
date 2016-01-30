#!/bin/env node

// Utility to post images

var optparse = require('optparse');
var redis = require("redis");
var redis_client = redis.createClient(null, null, { return_buffers: true });
var fs = require('fs');
var dateFormat = require('dateformat');
var _ = require('underscore');
var exec = require('child_process').exec;
var async = require('async');

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

function updateThumbnail(device, date, configuration, callback) {

  function process_dallas_temp(raw) {
    if (raw == undefined) {
      return "";
    } else {
      return raw / 1000;
    }
  }

  redis_client.get(date + ' ' + device, function (err, day_data) {

    var data = new Array(1440);

    _.each(JSON.parse(day_data), function (row) {

      var timestamp = new Date(row['timestamp'] * 1000);
      var date = dateFormat(timestamp, 'yyyy/mm/dd HH:MM:ss');

      data[(timestamp.getHours() * 60) + timestamp.getMinutes()] = row;
    });

    var csv = "Time";

    _.each(configuration.devices["rPI_46_1047_1"].sensors, function (details, key) {
      csv = csv + "," + details.label;
    });

    csv += "\n";

    var timestamp = new Date();

    for (var hour = 0; hour < 24; hour++) {

      timestamp.setHours(hour);    

      for (var minute = 0; minute < 60; minute++) {

        timestamp.setMinutes(minute);

        var row_data = data[(hour * 60) + minute];

        var time = dateFormat(timestamp, 'yyyy/mm/dd HH:MM:00');

        if (row_data == undefined)
          row_data = {};

        if (device == 'rPI_46_1047_1') {
          csv += time + "," + 
            process_dallas_temp(row_data['10-000802b42b40']) + "," +
            process_dallas_temp(row_data['10-000802b44f21']) + "," +
            process_dallas_temp(row_data['10-000802b49201']) + "," +
            process_dallas_temp(row_data['10-000802b4b181']) + "," +
            process_dallas_temp(row_data['28-00000720f6e6']) + "," +
            process_dallas_temp(row_data['28-000007213db1']) + "," +
            process_dallas_temp(row_data['28-000007217131']) + "," +
            process_dallas_temp(row_data['28-0000072191f9']) + "," +
            process_dallas_temp(row_data['28-000007474609']) + "," +
            process_dallas_temp(row_data['28-000007491929']) + "\n";
        }
      }
    }

    fs.writeFileSync('data.csv', csv);

    exec('gnuplot graphs/' + device + '_thumbnail.gnu', function (error, stdout, stderr) {

      var image = fs.readFileSync('output.png');

      var key = 'thumbnail ' + date + ' ' + device;

      redis_client.set(key, image);

      exec('gnuplot graphs/' + device + '_image.gnu', function (error, stdout, stderr) {

        var image = fs.readFileSync('output.png');

        var key = 'image ' + date + ' ' + device;

        redis_client.set(key, image);
        callback();
      });
    });
  });
}

var pattern = options['date'] + ' ' + options['device'];

fs.readFile('conf/conf.json', 'utf8', function (err, configuration_text) {

  if (err)
    throw err;

  var configuration = JSON.parse(configuration_text);

  redis_client.keys(pattern, function (err, thumbnail_keys) {
    async.series(_.map(thumbnail_keys, function(key) {
      return function(callback) {
        updateThumbnail(options['device'], key.toString('utf-8').substring(0, 10), configuration, callback);
      }
    }), function(err, results) {
      process.exit(0);
    });
  });
});
