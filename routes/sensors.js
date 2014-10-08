// sensors.js

var express = require('express');
var router = express.Router();
var parameters = require('../parameters');
var _ = require('underscore');

router.param('sensor_id', parameters.findSensor);

/* GET sensors listing. */
router.get('/', function(req, res) {

  var sensors = _.keys(configuration.devices);

  res.send('All sensors: ' + sensors);
});

router.get('/:sensor_id', function(req, res) {
  res.send('Sensor id:' + req.sensor_id);
});

router.get('/:device_id/sensors/:sensor_id', function(req, res) {
  res.send('Device id = ' + req.device_id + ' and sensor id = ' + req.sensor_id);
});

module.exports = router;
