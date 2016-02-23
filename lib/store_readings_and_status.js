// Script to consume readings and device status

function store_readings_and_status() {

  var fs = require('fs');
  var sprintf = require('sprintf-js').sprintf;
  var mqtt = require('mqtt');
  var redis = require('redis');
  var _ = require('underscore');

  var redis_client = redis.createClient();

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

        var date = new Date(parseInt(data['timestamp'], 10) * 1000);

        var base = sprintf('%02d-%02d-%02d', date.getFullYear(),
          date.getMonth() + 1, date.getDate());

        var key = base + " " + topic;

        redis_client.get(key, function (err, entry) {

          if (entry == null) {
            entry = [];
          } else {
            entry = JSON.parse(entry);
          }

          entry.push(data);

          redis_client.set(key, JSON.stringify(entry));
        });

      } catch (ex) {
        console.log(ex);
        console.log('Failed to process (' + topic + '): ' + message);
      }
    });

    status_client.on('message', function (topic, message) {

      try {

        var data = JSON.parse(message);

        var key = "status " + data["device"];

        redis_client.get(key, function (err, entries) {

          if (entries === null) {
            entries = [];
          } else {
            entries = JSON.parse(entries);
          }

          entries = entries.slice(1 - max_entries);

          entries.push(data);

          redis_client.set(key, JSON.stringify(entries));
        });

      } catch (ex) {
        console.log(ex);
        console.log('Failed to process (' + topic + '): ' + message);
      }
    });

    _.each(_.keys(configuration.devices), function (device_id) {
      readings_client.subscribe(device_id, { qos: 2 } );
    });

    status_client.subscribe('device_status');
  });
}

module.exports = store_readings_and_status;
