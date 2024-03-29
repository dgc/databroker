// devices.js

var express = require('express');
var router = express.Router();
var parameters = require('../lib/parameters');
var sensors = require('./sensors');
var _ = require('underscore');
var configuration = require('../lib/configuration');
var csv = require('csv');
var dateformat = require('dateformat');
var fs = require('fs');
var archiver = require('archiver');
var async = require('async');
var calendar = require('calendar');

var storage = require('../lib/storage.js');

router.param('device_id', parameters.findDevice);
router.param('view_id', parameters.findView);

router.use('/:device_id/sensors/', sensors);

function month_view_data(config, data) {

  var period = 300;

  function compareNumbers(a, b) {
    return a - b;
  }

  function closest_sample(s) {
    return Math.floor((s + (period / 2)) / period) * period;
  }

  var results = {};

  _.each(data, function (row) {

    var timestamp = closest_sample(row.timestamp);

    var aggregation = results[timestamp];

    if (aggregation == undefined)
      aggregation = { timestamp: timestamp };

    _.each(Object.keys(row), function (key) {

      var value = row[key];
      var existing = aggregation[key];

      if (existing == undefined) {

        aggregation[key] = { l: value, h: value };

      } else {

        if (aggregation[key].l > value)
          aggregation[key].l = value;

        if (aggregation[key].h < value)
          aggregation[key].h = value;
      }
    });

    results[closest_sample(row.timestamp)] = aggregation;
  });

  var timestamps = [];

  Object.keys(results).forEach(function (id) {
    timestamps.push(results[id].timestamp);
  });

  var sorted_timestamps = timestamps.sort(compareNumbers);

  var sorted_results = [];

  sorted_timestamps.forEach(function (timestamp) {
    sorted_results.push(results[timestamp]);
  });

  return sorted_results;
}

function convert_data(value, column, elapsed, configuration) {
  if (configuration[column]) {

    if (value == undefined)
      return value;

    switch (configuration[column].sensor_model) {
    case "RHT03":
      return parseInt(value) / 1000.0;
    case "DS18B20":
      return parseInt(value) / 1000.0;
    case "Voltage":
      return parseInt(value) / 1024.0 * 5.0;
    case "FIXME":
      return parseInt(value) / 1024.0 * 5.0 * 100.0;
    case "YF-S201":
      return parseInt(value) / (60 * 7.5);
    default:
      return value;
    }
  } else {
    var date = new Date(parseInt(value) * 1000);
    return dateformat(date, "yyyy/mm/dd HH:MM:ss");
  }
}

/* GET devices listing. */

router.get('/', function(req, res) {

  var status_keys = _.map(_.keys(configuration.devices), function (key) {
    return "status " + key;
  });
  
  storage.mget(status_keys, function (err, status_reports) {

    var reports = {};

    _.each(_.keys(configuration.devices), function (device_id, index) {
      if (status_reports[index] != null) {
        var json_report = JSON.parse(status_reports[index]);
        reports[device_id] = json_report[json_report.length - 1];
      }
    });

    res.render('devices', {
      breadcrumbs: [
        { label: 'Home', uri: '/graphs/' },
        { label: 'Devices' }
      ],
      devices: configuration.devices,
      reports: reports,
      dateformat: dateformat,
      _: _
    });
  });
});

function get_log_days(device_id, result_func) {

  var key_pattern = "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] " + device_id;

  storage.keys(key_pattern, function (err, keys) {
    keys = _.map(keys, function(key) { return key.toString('utf-8'); });
    result_func(err, keys)
  });
}

function key_exists(key, callback) {
  storage.exists(key, callback);
}

function dateToExcelDate(date) {
  return (date / (60 * 60 * 24 * 1000)) + 25569;
}

router.get('/:device_id', function(req, res) {

  var device_id = req.device_id;
  var sensor_configuration = configuration.devices[device_id].sensors;

  storage.get("status " + device_id, function(err, device_status) {

    storage.get("recent " + device_id, function(err, recent_readings) {

      var most_recent_readings;

      if (device_status != undefined) {
        device_status = JSON.parse(device_status);
        device_status = device_status[device_status.length - 1];
      }

      if (recent_readings != undefined) {
        recent_readings = JSON.parse(recent_readings);

        most_recent_readings = recent_readings.slice(-1)[0];

        _.each(configuration.devices[device_id].sensors, function(sensor_config, sensor_id) {
          if (most_recent_readings[sensor_id]) {

            most_recent_readings[sensor_id] = convert_data(most_recent_readings[sensor_id], sensor_id, 0 /* FIXME */, sensor_configuration);
          }
        });
      }

      get_log_days(req.device_id, function (err, days) {
    
        var most_recent_month;
        
        if (days.length > 0) {
          most_recent_month = days.sort()[days.length - 1].substring(0, 7);
        }
    
        res.render('device', {
          breadcrumbs: [
            { label: 'Home', uri: '/graphs/' },
            { label: 'Devices', uri: '/graphs/devices' },
            { label: configuration.devices[device_id].label }
          ],
          configuration: configuration,
          device_label: configuration.devices[req.device_id].label,
          sensors: configuration.devices[device_id].sensors,
          most_recent_readings: most_recent_readings,
          device: configuration.devices[device_id],
          device_id: device_id,
          device_status: device_status,
          dateformat: dateformat,
          most_recent_month: most_recent_month
        });
      });
    });
  });
});

// Month view

router.get('/:device_id/readings/:date(\\d{4}-\\d{2})', function(req, res) {

  var device_id = req.device_id;

  var yearString  = req.params.date.substring(0, 4);
  var monthString = req.params.date.substring(5, 7);

  var year  = parseInt(yearString);
  var month = parseInt(monthString);

  var cal = new calendar.Calendar(1).monthDays(year, month - 1);

  cal = _.map(cal, function(week) {
    return _.map(week, function(day) {
      if (day == 0) {
        return undefined;
      } else {
        return new Date(yearString + "-" + monthString + "-" + (('0' + day).slice(-2)));
      }
    });
  });

  var date      = new Date(yearString + "-" + monthString + "-01");
  var prevMonth = new Date(yearString + "-" + monthString + "-01");
  var nextMonth = new Date(yearString + "-" + monthString + "-01");

  if (date.getMonth() == 0) {
    prevMonth.setMonth(11);
    prevMonth.setFullYear(date.getFullYear() - 1);
    nextMonth.setMonth(1);
  } else if (date.getMonth() == 11) {
    prevMonth.setMonth(10);
    nextMonth.setMonth(0);
    nextMonth.setFullYear(date.getFullYear() + 1);
  } else {
    prevMonth.setMonth(date.getMonth() - 1);
    nextMonth.setMonth(date.getMonth() + 1);
  }

  var key_pattern = yearString + "-" + monthString + "-[0-9][0-9] " + device_id;

  storage.keys(key_pattern, function (err, data_keys) {

    storage.mget(data_keys, function (err, responses) {

      var day_data = {};

      for (var i = 0; i < data_keys.length; i++) {

        var data_key = data_keys[i];
        var data_date = data_key.toString('utf-8').substring(0, 10);

        day_data[data_date] = month_view_data(configuration.devices[device_id], JSON.parse(responses[i]));
      }

      res.render('device_month', {
        breadcrumbs: [
          { label: 'Home', uri: '/graphs/' },
          { label: 'Devices', uri: '/graphs/devices' },
          { label: configuration.devices[device_id].label, uri: '/graphs/devices/' + device_id },
          { label: dateformat(date, "mmmm yyyy") }
        ],
        device_id: device_id,
        device_label: configuration.devices[req.device_id].label,
        device_configuration: "var config = " + JSON.stringify(configuration.devices[req.device_id]) + ";",
        year: year,
        month: month,
        calendar: cal,
        date: date,
        dateformat: dateformat,
        day_data: JSON.stringify(day_data),
        prev_month: prevMonth,
        next_month: nextMonth
      });
    });
  });
});

router.get('/views/:view_id/readings/:date(\\d{4}-\\d{2})', function(req, res) {

  var view_id = req.view_id;

  var yearString  = req.params.date.substring(0, 4);
  var monthString = req.params.date.substring(5, 7);

  var year  = parseInt(yearString);
  var month = parseInt(monthString);

  var cal = new calendar.Calendar(1).monthDays(year, month - 1);

  cal = _.map(cal, function(week) {
    return _.map(week, function(day) {
      if (day == 0) {
        return undefined;
      } else {
        return new Date(yearString + "-" + monthString + "-" + (('0' + day).slice(-2)));
      }
    });
  });

  var date      = new Date(yearString + "-" + monthString + "-01");
  var prevMonth = new Date(yearString + "-" + monthString + "-01");
  var nextMonth = new Date(yearString + "-" + monthString + "-01");

  if (date.getMonth() == 0) {
    prevMonth.setMonth(11);
    prevMonth.setFullYear(date.getFullYear() - 1);
    nextMonth.setMonth(1);
  } else if (date.getMonth() == 11) {
    prevMonth.setMonth(10);
    nextMonth.setMonth(0);
    nextMonth.setFullYear(date.getFullYear() + 1);
  } else {
    prevMonth.setMonth(date.getMonth() - 1);
    nextMonth.setMonth(date.getMonth() + 1);
  }

  var devices = {};

  _.each(configuration.views[view_id].graphs, function(view) {
    _.each(view.sensors, function(sensor) {

      if (devices[sensor.device] === undefined) {
        devices[sensor.device] = [];
      }

      devices[sensor.device].push(sensor.sensor);
    });
  });

  key_patterns = [];

  var device_configurations = {};

  _.each(Object.keys(devices), function(device_id) {
    device_configurations[device_id] = configuration.devices[device_id];
    key_patterns.push(yearString + "-" + monthString + "-[0-9][0-9] " + device_id);
  });

  async.map(Object.keys(devices), function (device_id, callback) {

    var key_pattern = yearString + "-" + monthString + "-[0-9][0-9] " + device_id;

    storage.keys(key_pattern, function (err, data_keys) {

      storage.mget(data_keys, function (err, responses) {
  
        var day_data = {};
  
        for (var i = 0; i < data_keys.length; i++) {
  
          var data_key = data_keys[i];
          var data_date = data_key.toString('utf-8').substring(0, 10);
  
          day_data[data_date] = month_view_data(configuration.devices[device_id], JSON.parse(responses[i]));
        }

        callback(null, { "device" : device_id, "day_data" : day_data });
      });
    });

  }, function (err, day_data) {

    res.render('view_month', {
      breadcrumbs: [
        { label: 'Home', uri: '/graphs/' },
        { label: 'Views', uri: '/graphs/views' },
//          { label: configuration.devices[device_id].label, uri: '/graphs/devices/' + device_id },
        { label: dateformat(date, "mmmm yyyy") }
      ],
      view_id: view_id,
      view_label: configuration.views[view_id].label,
      device_configurations: "var device_config = " + JSON.stringify(device_configurations) + ";",
      view_configuration: "var view_config = " + JSON.stringify(configuration.views[view_id]) + ";",
      year: year,
      month: month,
      calendar: cal,
      date: date,
      dateformat: dateformat,
      day_data: JSON.stringify(day_data),
      prev_month: prevMonth,
      next_month: nextMonth
    });
  });

/*

    storage.mget(data_keys, function (err, responses) {

      var day_data = {};

      for (var i = 0; i < data_keys.length; i++) {

        var data_key = data_keys[i];
        var data_date = data_key.toString('utf-8').substring(0, 10);

        day_data[data_date] = month_view_data(configuration.devices[device_id], JSON.parse(responses[i]));
      }
*/
});
// Day view

router.get('/:device_id/readings/:date(\\d{4}-\\d{2}-\\d{2})', function(req, res) {

  var device_id = req.device_id;

  var year  = req.params.date.substring(0, 4);
  var month = req.params.date.substring(5, 7);
  var day   = req.params.date.substring(8, 10);

  var data_key = year + "-" + month + "-" + day + " " + device_id;

  var date = new Date(year + "-" + month + "-" + day);

  var nextDay = new Date(date);
  var prevDay = new Date(date);

  prevDay.setDate(date.getDate() - 1);
  nextDay.setDate(date.getDate() + 1);

  storage.get(data_key, function(err, data) {

    res.render('device_day', {
      breadcrumbs: [
        { label: 'Home', uri: '/graphs/' },
        { label: 'Devices', uri: '/graphs/devices' },
        { label: configuration.devices[device_id].label, uri: '/graphs/devices/' + device_id },
        { label: dateformat(date, "mmmm yyyy"), uri: year + "-" + month },
        { label: dateformat(date, "d") }
      ],
      device_id: device_id,
      device_label: configuration.devices[req.device_id].label,
      device_configuration: "var config = " + JSON.stringify(configuration.devices[req.device_id]) + ";",
      year: year,
      month: month,
      day: day,
      date: date,
      dateformat: dateformat,
      next_day: nextDay,
      prev_day: prevDay,
      data: "var data = " + data + ";"
    });
  });
});

router.get('/:device_id/data.:format?', function (req, res) {
  
  function get_data(data, column, configuration) {
    try {
      if (configuration[column]) {
        if (configuration[column].sensor_model == 'CurrentCostTIAM') {
          var doc = libxmljs.parseXml(data.message);
          var el = doc.get('/msg/sensor');
          var sensor_number = el.text();

          if (sensor_number != configuration[column].sensor)
            return undefined;

          return el = doc.get('/msg/ch1/watts').text();
        }
      }
      return data[column];
    }
    catch(err) {
      // Do nothing on error - will result in blank entry
    }
  }

  var key_pattern = "\\d\\d\\d\\d-\\d\\d-\\d\\d " + req.device_id;
  var chartStart;
  var chartEnd;

  if (req.query["day"]) {
    var fields = req.query["day"].match(/^(\d\d\d\d)(\d\d)(\d\d)$/)

    if (fields) {
      key_pattern = fields[1] + "-" + fields[2] + "-" + fields[3] + " " + req.device_id;

      chartStart = dateToExcelDate(Date.parse(fields[1] + "-" + fields[2] + "-" + fields[3] + "T00:00:00Z"));
      chartEnd = chartStart + 1;
    }
  }

  storage.keys(key_pattern, function (err, keys) {
    storage.mget(keys, function (err, readings_sets) {

      res.status(200)

      var data = [];

      _.each(readings_sets, function(readings) {
        data = data.concat(JSON.parse(readings));
      });

      /* Format the data. */

      var download_name = req.query['day'] + '_' + req.device_id;

      switch (req.params.format) {

        case "csv":
        case "tsv":

          if (req.params.format == 'csv') {
            res.attachment(download_name + '.csv');
            res.header("Content-Type", "text/csv");
          } else {
            res.attachment(download_name + '.tsv');
            res.header("Content-Type", "text/tab-separated-values");
          }
// --------------------------------------------------------------------------------------

          var device_id = req.device_id;
          var raw_mode = req.query["raw"] == "true";
          var format = req.params.format;

          var sensor_configuration = configuration.devices[device_id].sensors;
          var columns = ['timestamp'].concat(_.keys(sensor_configuration));

          column_headers = columns;

          if (raw_mode == false) {
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

          if (format == 'tsv')
            csv_opts["delimiter"] = "\t";

          data = _.map(data, function(row_data, row_index) {
            return _.map(columns, function(column) {

              var cell = get_data(row_data, column, sensor_configuration);

              if (raw_mode == false) {

                var elapsed = undefined;

                if (row_data["timestamp"] != undefined) {
                  if (data.length > 1) {
                    if (row_index == 0) {
                      elapsed = data[1]["timestamp"] - data[0]["timestamp"];
                    } else {
                      elapsed = data[row_index]["timestamp"] - data[row_index - 1]["timestamp"];
                    }
                  }
                }

                cell = convert_data(cell, column, elapsed, sensor_configuration);
              }

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

        break;
      }
    });
  });
});

router.get('/:device_id/images/:date.png', function (req, res) {
  var parsed_date = req.params.date.match(/^\d\d\d\d-\d\d-\d\d/)

  if (parsed_date === null) {
    res.status(404).end();
    return;
  }

  var key = "image " + parsed_date[0] + " " + req.device_id;

  storage.get(key, function(err, data) {

    if (data === null) {
      res.status(404).end();
      return;
    }

    res.header("Content-Type", "image/png");
    res.write(data, 'binary');
    res.end();
  });
});

module.exports = router;
