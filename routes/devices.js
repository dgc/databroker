var express = require('express');
var router = express.Router();
var parameters = require('../parameters');
var sensors = require('./sensors');
var _ = require('underscore');

router.param('device_id', parameters.findDevice);

router.use('/:device_id/sensors/', sensors);

/* GET devices listing. */
router.get('/', function(req, res) {

  var devices = _.keys(configuration.devices);

  res.send('All devices: ' + devices);
});

router.get('/:device_id', function(req, res) {
  res.send('Device id = ' + req.device_id);
});

module.exports = router;
