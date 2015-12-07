// Script to store device status

var mqtt_server = 'labbroker.soton.ac.uk';
var mqtt_port = 1883;

var max_entries = 1000;

var fs = require('fs');
var sprintf = require('sprintf-js').sprintf;
var mqtt = require('mqtt');
var redis = require('redis');
var _ = require('underscore');

var mqtt_client = mqtt.createClient(mqtt_port, mqtt_server);
var redis_client = redis.createClient();

mqtt_client.on('message', function (topic, message) {

  try {

   var data = JSON.parse(message);

   var key = "status " + data["device"];

   redis_client.get(key, function (err, entries) {

     if (entries == null) {
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

mqtt_client.subscribe('device_status');
