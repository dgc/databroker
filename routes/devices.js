

var express = require('express');
var router = express.Router();
var parameters = require('../parameters');
var sensors = require('./sensors');
var _ = require('underscore');
var configuration = require('../configuration');
var redis = require("redis");
var csv = require('csv');
var dateformat = require('dateformat');

var redis_client = redis.createClient();

router.param('device_id', parameters.findDevice);

router.use('/:device_id/sensors/', sensors);

/* GET devices listing. */
router.get('/', function(req, res) {

  var devices = _.map(_.keys(configuration.devices), function (key) {
    return ["/devices/" + key, configuration.devices[key].label];
  });

  res.render('devices', {
    breadcrumbs: [
      { label: 'Home', uri: '/' },
      { label: 'Devices' }
    ],
    devices: devices
  });
});

function get_log_days(device_id, result_func) {

  var key_pattern = "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] " + device_id;

  redis_client.keys(key_pattern, function (err, keys) {
    result_func(err, keys)
  });
}

router.get('/:device_id', function(req, res) {

  var device_id = req.device_id;

  var sensors = _.map(_.keys(configuration.devices[device_id].sensors), function (key) {
    return ["/devices/" + device_id + '/sensors/' + key,
      configuration.devices[device_id].sensors[key].label];
  });

  get_log_days(req.device_id, function (err, days) {

    readings = _.map(days.sort(), function(day) {
      return ["/devices/" + device_id + "/data.csv?day=" + day.substring(0, 4) + day.substring(5, 7) + day.substring(8, 10), day.substring(0, 10)];
    });

    var readings = _.groupBy(readings, function(day) {
      return day[1].substring(0, 7);
    });

    res.render('device', {
      breadcrumbs: [
        { label: 'Home', uri: '/' },
        { label: 'Devices', uri: '/devices' },
        { label: configuration.devices[device_id].label }
      ],
      device_label: configuration.devices[req.device_id].label,
      readings: readings,
      sensors: sensors
    });
  });

});

router.get('/:device_id/data.:format?', function (req, res) {
  
  function convert_data(value, column, configuration) {
    if (configuration[column]) {
      switch (configuration[column].sensor_model) {
      case "rht03":
        return parseInt(value) / 1000.0;
      case "Voltage":
        return parseInt(value) / 1024.0 * 5.0;
      case "FIXME":
        return parseInt(value) / 1024.0 * 5.0 * 100.0;
      default:
        return value;
      }
    } else {
      var date = new Date(parseInt(value) * 1000);
      return dateformat(date, "yyyy/mm/dd HH:MM:ss");
    }
  }

  var key_pattern = "\\d\\d\\d\\d-\\d\\d-\\d\\d " + req.device_id;

  if (req.query["day"]) {
    var fields = req.query["day"].match(/^(\d\d\d\d)(\d\d)(\d\d)$/)

    if (fields) {
      key_pattern = fields[1] + "-" + fields[2] + "-" + fields[3] + " " + req.device_id;
    }
  }

  redis_client.keys(key_pattern, function (err, keys) {
    redis_client.mget(keys, function (err, readings_sets) {
      var data = [];

      _.each(readings_sets, function(readings) {
        data = data.concat(JSON.parse(readings));
      });

      var sensor_configuration = configuration.devices[req.device_id].sensors;

      var columns = ['timestamp'].concat(_.keys(sensor_configuration));

      /* Format the data. */

      res.status(200)

      switch (req.params.format) {

        case "csv":

          res.header("Content-Type", "text/csv");
console.log(req.query)

          column_headers = columns;

          if (req.query["raw"] != "true") {
            column_headers = _.map(columns, function(column) {
              if (sensor_configuration[column]) {
                return sensor_configuration[column].label;
              } else if (column == "timestamp") {
                return "Time";
              } else {
                return column;
              }
            });
          }

          var csv_opts = { columns: column_headers, header: true };

          data = _.map(data, function(row_data) {
            return _.map(columns, function(column) {
              var cell = row_data[column];

              if (req.query["raw"] != "true")
                cell = convert_data(cell, column, sensor_configuration);

              return cell;
            });
          });

          csv.stringify(data, csv_opts, function(err, output) {
            res.end(output);
          });

        break;
         
        case "json":
          res.header("Content-Type", "application/json");
          res.end(JSON.stringify(data));
      }
    });
  });
});

module.exports = router;
