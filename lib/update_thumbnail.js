var redis = require("redis");
var redis_client = redis.createClient(null, null, { return_buffers: true });
var dateFormat = require('dateformat');
var fs = require('fs');
var exec = require('child_process').exec;
var _ = require('underscore');

function updateThumbnail(device, date, configuration, callback) {

  function process_data(raw, sensor) {

    switch (sensor.sensor_model) {

    case "RHT03":
    case "DS18B20":

      if (raw == undefined) {
        return "";
      } else {
        return raw / 1000;
      }

    case "YF-S201":

      if (raw == undefined) {
        return "";
      } else {
        return raw / (60 * 7.5);
      }
    }

    return "";
  }

  redis_client.get(date + ' ' + device, function (err, day_data) {

    var data = new Array(1440);

    _.each(JSON.parse(day_data), function (row) {

      var timestamp = new Date(row['timestamp'] * 1000);
      var date = dateFormat(timestamp, 'yyyy/mm/dd HH:MM:ss');

      data[(timestamp.getHours() * 60) + timestamp.getMinutes()] = row;
    });

    var csv = "Time";

    _.each(configuration.devices[device].sensors, function (details, key) {
      csv = csv + "," + details.label;
    });

    csv += "\r\n";

    var timestamp = new Date();

    for (var hour = 0; hour < 24; hour++) {

      timestamp.setHours(hour);

      for (var minute = 0; minute < 60; minute++) {

        timestamp.setMinutes(minute);

        var row_data = data[(hour * 60) + minute];

        var time = dateFormat(timestamp, 'yyyy/mm/dd HH:MM:00');

        if (row_data == undefined)
          row_data = {};

        csv += time;

        _.each(_.keys(configuration.devices[device].sensors), function (sensor_id) {
          csv += "," + process_data(row_data[sensor_id], configuration.devices[device].sensors[sensor_id]);
        });

        csv += "\r\n";
      }
    }
console.log("Processing " + date);
    fs.writeFile('data.csv', csv, function (error) {

      exec('gnuplot graphs/' + device + '_thumbnail.gnu', function (error, stdout, stderr) {

        fs.readFile('output.png', function (error, image) {

          var key = 'thumbnail ' + date + ' ' + device;

          redis_client.set(key, image);

          exec('gnuplot graphs/' + device + '_image.gnu', function (error, stdout, stderr) {

            fs.readFile('output.png', function (error, image) {

              var key = 'image ' + date + ' ' + device;

              redis_client.set(key, image);

              fs.unlink('data.csv', function () {
                fs.unlink('output.png', function () {
                  callback();
                });
              });
            });
          });
        });
      });
    });
  });
}

module.exports = updateThumbnail;
