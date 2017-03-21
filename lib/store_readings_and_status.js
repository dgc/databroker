// Script to consume readings and device status

function store_readings_and_status() {

  var fs = require('fs');
  var sprintf = require('sprintf-js').sprintf;
  var mqtt = require('mqtt');
  var _ = require('underscore');
  var storage = require('../lib/storage.js');

  fs.readFile('conf/conf.json', 'utf8', function (err, configuration_text) {

    if (err)
      throw err;

    var configuration = JSON.parse(configuration_text);

    var mqtt_server = configuration.mqtt_server.address;
    var mqtt_port   = configuration.mqtt_server.port;
    var max_entries = configuration.mqtt_server.max_health_readings;

    var readings_client = mqtt.createClient(mqtt_port, mqtt_server);
    var status_client = mqtt.createClient(mqtt_port, mqtt_server);

    readings_client.on('message', function (topic, message) {
   
      try {

        var data = JSON.parse(message);

        data.log_timestamp = Math.floor(Date.now() / 1000);

        // Maintain the most current reading.

        var most_recent_key = "recent " + topic;

        // Store data in the day record.

        var date = new Date(parseInt(data['timestamp'], 10) * 1000);

        var base = sprintf('%02d-%02d-%02d', date.getFullYear(),
          date.getMonth() + 1, date.getDate());

        // var base = sprintf('%02d-%02d-%02d', date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

        var day_key = base + " " + topic;

        var entry = storage.getSync(day_key);

        if (entry == null) {
          entry = [];
        } else {
          entry = JSON.parse(entry);
        }

        entry.push(data);

        storage.set(day_key, JSON.stringify(entry));

        var most_recent_entries = storage.getSync(most_recent_key);

        if (most_recent_entries == null) {
          most_recent_entries = [];
        } else {
          most_recent_entries = JSON.parse(most_recent_entries);
        }

        most_recent_entries.push(data);

        // Choose to keep the most recent 10. This might need to change or
        // at least be configurable.

        most_recent_entries = most_recent_entries.slice(-10);

        storage.set(most_recent_key, JSON.stringify(most_recent_entries));

      } catch (ex) {
        // console.log(ex);
        // console.log('Failed to process (' + topic + '): ' + message);
      }
    });

    status_client.on('message', function (topic, message) {

      try {

        var data = JSON.parse(message);

        var key = "status " + data["device"];

        storage.get(key, function (err, entries) {

          if (entries) {
            entries = JSON.parse(entries);
          } else {
            entries = [];
          }

          entries = entries.slice(1 - max_entries);

          entries.push(data);

          storage.set(key, JSON.stringify(entries));
        });

      } catch (ex) {
        // console.log(ex);
        // console.log('Failed to process (' + topic + '): ' + message);
      }
    });

    _.each(_.keys(configuration.devices), function (device_id) {
      readings_client.subscribe(device_id, { qos: 2 } );
    });

    status_client.subscribe('device_status');
  });
}

module.exports = store_readings_and_status;
