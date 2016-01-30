

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
var async = require('async');
var calendar = require('calendar');

//var redis_client = redis.createClient();
var redis_client = redis.createClient(null, null, { return_buffers: true });

router.param('device_id', parameters.findDevice);

router.use('/:device_id/sensors/', sensors);

/* GET devices listing. */
router.get('/', function(req, res) {

  var status_keys = _.map(_.keys(configuration.devices), function (key) {
    return "status " + key;
  });
  
  redis_client.mget(status_keys, function (err, status_reports) {

    var reports = {};

    _.each(_.keys(configuration.devices), function (device_id, index) {
      if (status_reports[index] != null) {
        var json_report = JSON.parse(status_reports[index]);
        reports[device_id] = json_report[json_report.length - 1];
      }
    });

    res.render('devices', {
      breadcrumbs: [
        { label: 'Home', uri: '/' },
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

  redis_client.keys(key_pattern, function (err, keys) {
    keys = _.map(keys, function(key) { return key.toString('utf-8'); });
    result_func(err, keys)
  });
}

function key_exists(key, callback) {
  redis_client.exists(key, callback);
}

function dateToExcelDate(date) {
  return (date / (60 * 60 * 24 * 1000)) + 25569;
}

router.get('/:device_id', function(req, res) {

  var device_id = req.device_id;

  redis_client.get("status " + device_id, function(err, device_status) {

    if (device_status !== null) {
      device_status = JSON.parse(device_status);
      device_status = device_status[device_status.length - 1];
    }

    get_log_days(req.device_id, function (err, days) {
  
      var thumbnail_keys = _.map(days, function(day) {
        return "thumbnail " + day;
      });
  
      var most_recent_month;
      
      if (days.length > 0) {
        most_recent_month = days.sort()[days.length - 1].substring(0, 7);
      }
  
      async.map(thumbnail_keys, key_exists, function(err, thumbnail_exists) {
  
        var thumbnails = {};
  
        _.each(days, function(day, index) {
          if (thumbnail_exists[index] == 1) {
            thumbnails[day] = '/devices/' + device_id + '/thumbnails/' + day.substring(0, 10) + '.png';
          }
        });
  
        readings = _.map(days.sort(), function(day) {
          return ["/devices/" + device_id + "/data.csv?day=" + day.substring(0, 4) + day.substring(5, 7) + day.substring(8, 10), day.substring(0, 10)];
        });
  
        var readings = _.groupBy(readings, function(day) {
          return day[1].substring(0, 7);
        });
  
        days = _.map(days, function(day) {
  
          var date = moment(day.substring(0, 10));
          var date_string = day.substring(0, 4) + day.substring(5, 7) + day.substring(8, 10);
  
          // Day adjustment, starting from Sunday to get to Monday.
          var day_adjust = [-6, 0, -1, -2, -3, -4, -5];
  
          var days_since_sunday = date.day();
          var days_since_monday = (days_since_sunday + 6) % 7;
          var start_of_week = date.clone().add(day_adjust[days_since_sunday], 'days');
          var label = date.format("DD MMM");
  
          var csv_url = "/devices/" + device_id + "/data.csv?day=" + date_string;
  
          var xlsx_url;
          
          if (device_id == "rPI_46_1047_1")
            xlsx_url = "/devices/" + device_id + "/data.xlsx?day=" + date_string;
  
          var day_metadata = {
            key: day,
            thumbnail: thumbnails[day],
            date: date,
            monday: start_of_week,
            label: label,
            dow: days_since_monday,
            csv: csv_url,
            xlsx: xlsx_url
          };
  
          return day_metadata;
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
  
            if (diff > (((7 * 24) + 1) * 60 * 60 * 1000))
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
          sensors: configuration.devices[device_id].sensors,
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

  var key_pattern = "thumbnail " + yearString + "-" + monthString + "-[0-9][0-9] " + device_id;

  redis_client.keys(key_pattern, function (err, thumbnail_keys) {

    thumbnails = {}

    _.each(thumbnail_keys, function(key) {
      var thumbnail_date = key.toString('utf-8').substring(10, 20);
      thumbnails[thumbnail_date] = '/devices/' + device_id + '/thumbnails/' + thumbnail_date + '.png';
    });

    res.render('device_month', {
      breadcrumbs: [
        { label: 'Home', uri: '/' },
        { label: 'Devices', uri: '/devices' },
        { label: configuration.devices[device_id].label, uri: '/devices/' + device_id },
        { label: dateformat(date, "mmmm yyyy") }
      ],
      device_id: device_id,
      device_label: configuration.devices[req.device_id].label,
      year: year,
      month: month,
      calendar: cal,
      date: date,
      dateformat: dateformat,
      thumbnails: thumbnails,
      prev_month: prevMonth,
      next_month: nextMonth
    });
  });
});

// Day view

router.get('/:device_id/readings/:date(\\d{4}-\\d{2}-\\d{2})', function(req, res) {

  var device_id = req.device_id;

  var year  = req.params.date.substring(0, 4);
  var month = req.params.date.substring(5, 7);
  var day   = req.params.date.substring(8, 10);

  var image_key = "image " + year + "-" + month + "-" + day + " " + device_id;
  var image_uri = "/devices/" + device_id + "/images/" + year + "-" + month + "-" + day + ".png";

  var date = new Date(year + "-" + month + "-" + day);

  var nextDay = new Date(date);
  var prevDay = new Date(date);

  prevDay.setDate(date.getDate() - 1);
  nextDay.setDate(date.getDate() + 1);

  redis_client.exists(image_key, function (err, image_exists) {
    res.render('device_day', {
      breadcrumbs: [
        { label: 'Home', uri: '/' },
        { label: 'Devices', uri: '/devices' },
        { label: configuration.devices[device_id].label, uri: '/devices/' + device_id },
        { label: dateformat(date, "mmmm yyyy"), uri: year + "-" + month },
        { label: dateformat(date, "d") }
      ],
      device_id: device_id,
      device_label: configuration.devices[req.device_id].label,
      year: year,
      month: month,
      day: day,
      date: date,
      dateformat: dateformat,
      next_day: nextDay,
      prev_day: prevDay,
      image_uri: image_exists ? image_uri : undefined
    });
  });
});

router.get('/:device_id/data.:format?', function (req, res) {
  
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

  redis_client.keys(key_pattern, function (err, keys) {
    redis_client.mget(keys, function (err, readings_sets) {

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

        case "xlsx":

          res.attachment(download_name + '.xlsx');
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

router.get('/:device_id/thumbnails/:date.png', function (req, res) {
  var parsed_date = req.params.date.match(/^\d\d\d\d-\d\d-\d\d/)

  if (parsed_date === null) {
    res.status(404).end();
    return;
  }

  var key = "thumbnail " + parsed_date[0] + " " + req.device_id;

  redis_client.get(key, function(err, data) {

    if (data === null) {
      res.status(404).end();
      return;
    }

    res.header("Content-Type", "image/png");
    res.write(data, 'binary');
    res.end();
  });
});

router.get('/:device_id/images/:date.png', function (req, res) {
  var parsed_date = req.params.date.match(/^\d\d\d\d-\d\d-\d\d/)

  if (parsed_date === null) {
    res.status(404).end();
    return;
  }

  var key = "image " + parsed_date[0] + " " + req.device_id;

  redis_client.get(key, function(err, data) {

    if (data === null) {
      res.status(404).end();
      return;
    }

    res.header("Content-Type", "image/png");
    res.write(data, 'binary');
    res.end();
  });
});

router.get('/:device_id/gnuplot/:gnuplot.gnu', function (req, res) {

  var gnuplot = req.params.gnuplot;

  if ((gnuplot == 'image') || (gnuplot == 'thumbnail')) {

    var filename = "graphs/" + req.device_id + "_" + gnuplot + ".gnu";
    
    fs.readFile(filename, function (err, data) {

      res.header("Content-Type", "text/plain");
      res.write(data, 'binary');
      res.end();
    });
  }
});

module.exports = router;
