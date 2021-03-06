var configuration = require('../lib/configuration');

function findDevice(req, res, next, device_id) {

  if (configuration.devices[device_id] === undefined) {
    var err = new Error('Device not found');
    err.code = 404
    next(err);
  } else {
    req.device_id = device_id;
    next()
  }
}

function findSensor(req, res, next, sensor_id) {

  if (configuration.devices[req.device_id].sensors[sensor_id] === undefined) {
    var err = new Error('Sensor not found');
    err.code = 404
    next(err);
  } else {
    req.sensor_id = sensor_id;
    next()
  }
}

function findView(req, res, next, view_id) {

  if (configuration.views[view_id] === undefined) {
    var err = new Error('View not found');
    err.code = 404
    next(err);
  } else {
    req.view_id = view_id;
    next()
  }
}

exports.findDevice = findDevice;
exports.findSensor = findSensor;
exports.findView = findView;
