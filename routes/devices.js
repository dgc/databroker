

var express = require('express');
var router = express.Router();
var parameters = require('../parameters');
var sensors = require('./sensors');
var _ = require('underscore');
var configuration = require('../configuration');
var redis = require("redis");
var csv = require('csv');

var redis_client = redis.createClient();

router.param('device_id', parameters.findDevice);

router.use('/:device_id/sensors/', sensors);

/* GET devices listing. */
router.get('/', function(req, res) {

  var devices = _.map(_.keys(configuration.devices), function (key) {
    return ["/devices/" + key, configuration.devices[key].label];
  });

  res.render('devices', { devices: devices });
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

  var months = 45;

  get_log_days(req.device_id, function (err, days) {
    console.log(days);
    res.render('device', {
      device_label: configuration.devices[req.device_id].label,
      months: months,
      sensors: sensors
    });
  });

});

router.get('/:device_id/data.:format?', function (req, res) {
  
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

      /* Format the data. */

      res.status(200)

      switch (req.params.format) {

        case "csv":
          res.header("Content-Type", "text/csv");

          var columns = ['timestamp'].concat(_.keys(configuration.devices[req.device_id].sensors));

          var csv_opts = { columns: columns, header: true };

          data = _.map(data, function(row_data) {
            return _.map(columns, function(column) {
              return row_data[column];
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
