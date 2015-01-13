

var express = require('express');
var router = express.Router();
var parameters = require('../parameters');
var sensors = require('./sensors');
var _ = require('underscore');
var configuration = require('../configuration');
var redis = require("redis");
var csv = require('csv');
var dateformat = require('dateformat');
var fs = require('fs');
var archiver = require('archiver');
var libxmljs = require("libxmljs");
var moment = require('moment');

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

function dateToExcelDate(date) {
  return (date / (60 * 60 * 24 * 1000)) + 25569;
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

    days = _.map(days, function(day) {

      var date = moment(day.substring(0, 10));

      // Day adjustment, starting from Sunday to get to Monday.
      var day_adjust = [-6, 0, -1, -2, -3, -4, -5];

      var days_since_sunday = date.day();
      var days_since_monday = (days_since_sunday + 6) % 7;
      var start_of_week = date.clone().add(day_adjust[days_since_sunday], 'days');
      var label = date.format("DD MMM");

      var csv_url = "/devices/" + device_id + "/data.csv?day=" + day.substring(0, 4) + day.substring(5, 7) + day.substring(8, 10);

      var xlsx_url;
      
      if (device_id == "rPI_46_1047_1")
        xlsx_url = "/devices/" + device_id + "/data.xlsx?day=" + day.substring(0, 4) + day.substring(5, 7) + day.substring(8, 10);

      return {
        key: day,
        date: date,
        monday: start_of_week,
        label: label,
        dow: days_since_monday,
        csv: csv_url,
        xlsx: xlsx_url
      };
    })

    var calendar = _.groupBy(days, function(day) {
      return day.monday;
    });

    calendar = _.map(calendar, function(days, sow) {
      week = [];
      _.each(days, function(day) {
        week[day.dow] = day;
      });
      return [sow, week, false];
    });

    _.each(calendar, function(week, i) {
      if (i > 0) {
        var diff = moment(calendar[i][0]) - moment(calendar[i - 1][0]);

        if (diff != 7 * 24 * 60 * 60 * 1000)
          week[2] = true;
      }
    });

    res.render('device', {
      breadcrumbs: [
        { label: 'Home', uri: '/' },
        { label: 'Devices', uri: '/devices' },
        { label: configuration.devices[device_id].label }
      ],
      device_label: configuration.devices[req.device_id].label,
      readings: readings,
      calendar: calendar,
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

        break;

        case "xlsx":
          res.attachment('test.xlsx');
          res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

          var archive = archiver('zip');

          archive.on('error', function(err) {
            res.status(500).send({ error: err.message });
          });

          res.on('close', function() {
            res.status(200).send('OK').end();
          });

          var files = [
            "xl/workbook.xml",
            "xl/drawings/drawing1.xml",
            "xl/drawings/_rels/drawing1.xml.rels",
            "xl/sharedStrings.xml",
            "xl/_rels/workbook.xml.rels",
            "xl/worksheets/sheet2.xml",
            "xl/worksheets/sheet1.xml",
            "xl/worksheets/_rels/sheet1.xml.rels",
            "xl/worksheets/_rels/sheet2.xml.rels",
            "xl/charts/style1.xml",
            "xl/charts/colors1.xml",
            "xl/charts/_rels/chart1.xml.rels",
            "xl/charts/chart1.xml",
            "xl/printerSettings/printerSettings1.bin",
            "xl/theme/theme1.xml",
            "xl/styles.xml",
            "docProps/app.xml",
            "docProps/core.xml",
            "[Content_Types].xml",
            "_rels/.rels",
          ];

          archive.pipe(res);

          _.each(files, function(file) {
            var filename = 'templates/template1/' + file;
            var content = fs.readFileSync(filename);

            var ns = {
              c:  'http://schemas.openxmlformats.org/drawingml/2006/chart',
              a:  'http://schemas.openxmlformats.org/drawingml/2006/main',
              ss: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
            };

            if (file == 'xl/charts/chart1.xml') {

              var doc = libxmljs.parseXml(content.toString());

              var titleElement = doc.get('/c:chartSpace/c:chart/c:title//a:t', ns);
              titleElement.text('New title');

              _.each(doc.find('/c:chartSpace/c:chart/c:plotArea/c:valAx', ns), function(valAx) {
                if (valAx.get('c:title//a:t[. = "Time"]', ns)) {
                  valAx.get('c:scaling/c:min/@val', ns).value(chartStart);
                  valAx.get('c:scaling/c:max/@val', ns).value(chartEnd);
                  // console.log(valAx.get('c:scaling/c:min/@val', ns));
                }
              });

              content = doc.toString();

            } else if (file == 'xl/worksheets/sheet1.xml') {

              var doc = libxmljs.parseXml(content.toString());

              var dim_el = doc.find('/ss:worksheet/ss:dimension', ns)[0];

              // Set the overall worksheet dimension
              dim_el.attr('ref').value('A1:K' + (data.length + 1));

              var sheet_data = doc.find('/ss:worksheet/ss:sheetData', ns)[0];

              sheet_data.node("row").attr({ r: 1, s: 1, customFormat: 1, spans: "1:11", ht: "68.25" })

                .node('c').attr({ r: "A1", s: "1", t: "s" }).node('v', '9').parent().parent()
                .node('c').attr({ r: "B1", s: "1", t: "s" }).node('v', '0').parent().parent()
                .node('c').attr({ r: "C1", s: "1", t: "s" }).node('v', '1').parent().parent()
                .node('c').attr({ r: "D1", s: "1", t: "s" }).node('v', '2').parent().parent()
                .node('c').attr({ r: "E1", s: "1", t: "s" }).node('v', '3').parent().parent()
                .node('c').attr({ r: "G1", s: "2", t: "s" }).node('v', '8').parent().parent()
                .node('c').attr({ r: "H1", s: "1", t: "s" }).node('v', '4').parent().parent()
                .node('c').attr({ r: "I1", s: "1", t: "s" }).node('v', '5').parent().parent()
                .node('c').attr({ r: "J1", s: "1", t: "s" }).node('v', '6').parent().parent()
                .node('c').attr({ r: "K1", s: "1", t: "s" }).node('v', '7').parent().parent()

              var row = 2;

              _.each(data, function(row_data, index) {
 
                sheet_data.node("row").attr({ r: row, spans: '1:11' })
                  .node('c').attr({ r: 'A' + row }).node('v', row_data['timestamp'] + "").parent().parent()
                  .node('c').attr({ r: 'B' + row }).node('v', row_data['10-000802b42b40'] + "").parent().parent()
                  .node('c').attr({ r: 'C' + row }).node('v', row_data['10-000802b44f21'] + "").parent().parent()
                  .node('c').attr({ r: 'D' + row }).node('v', row_data['10-000802b49201'] + "").parent().parent()
                  .node('c').attr({ r: 'E' + row }).node('v', row_data['10-000802b4b181'] + "").parent().parent()
                  .node('c').attr({ r: 'G' + row, s: 3 }).node('f', 'A' + row + '/(60*60*24)+"1/1/1970"').parent().node('v', (25569 + (row_data['timestamp'] / (60 * 60 * 24))) + "").parent().parent()
                  .node('c').attr({ r: 'H' + row }).node('f', 'B' + row + '/1000').parent().node('v', (row_data['10-000802b42b40'] / 1000) + "").parent().parent()
                  .node('c').attr({ r: 'I' + row }).node('f', 'C' + row + '/1000').parent().node('v', (row_data['10-000802b44f21'] / 1000) + "").parent().parent()
                  .node('c').attr({ r: 'J' + row }).node('f', 'D' + row + '/1000').parent().node('v', (row_data['10-000802b49201'] / 1000) + "").parent().parent()
                  .node('c').attr({ r: 'K' + row }).node('f', 'E' + row + '/1000').parent().node('v', (row_data['10-000802b4b181'] / 1000) + "").parent().parent()

                row = row + 1;

                // Insert blank lines when the timestamp gap is too big.
                if (index < (data.length - 2)) {
                  if ((data[index + 1]["timestamp"] - data[index]["timestamp"]) > 120) {
                    row = row + 1;
                  }
                }
              });

              content = doc.toString();
            }

            archive.append(content, { name: file });
          });

          archive.finalize();

        break;

      }
    });
  });
});

module.exports = router;
