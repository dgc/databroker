// Script to consume the DataBroker events

var mqtt_server = 'labbroker.soton.ac.uk';
var mqtt_port = 1883;

var fs = require('fs');
var sprintf = require('sprintf-js').sprintf;
var mqtt = require('mqtt');
var redis = require('redis');
var _ = require('underscore');

var mqtt_client = mqtt.createClient(mqtt_port, mqtt_server);
var redis_client = redis.createClient();

fs.readFile('conf/conf.json', 'utf8', function (err, configuration_text) {

  if (err)
    throw err;

  var configuration = JSON.parse(configuration_text);

  mqtt_client.on('message', function (topic, message) {
 
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

  _.each(_.keys(configuration.devices), function (device_id) {

    console.log("Subscribed to: " + configuration.devices[device_id].label);

    mqtt_client.subscribe(device_id, { qos: 2 } );
  });
});
