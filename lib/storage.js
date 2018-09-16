// Storage module

var _ = require('underscore');
var fs = require('fs');

var storage = new Object();
var dataDir = "data";

function localFileName(key) {
  return dataDir + "/" + key;
}

// exists

storage.exists = function (key, callback) {
  fs.stat(localFileName(key), function (err, stat) {
    if (err == null) {
      callback(null, true);
    } else if (err.code == 'ENOENT') {
      callback(null, false);
    } else {
      callback(err, undefined);
    }
  });
}

// get

storage.get = function(key, callback) {
  try {
    callback(undefined, fs.readFileSync(localFileName(key)))
  } catch (e) {
    callback(e, undefined);
  }
};

// set

storage.set = function(key, value) {
  fs.writeFileSync(localFileName(key), value);
};

// keys

storage.keys = function (pattern, callback) {

  var regexp = new RegExp("^" + pattern + "$");

  fs.readdir(dataDir, function (err, fileList) {

    fileList = _.filter(fileList, function (key) {
      return key.match(regexp);
    });

    callback(undefined, fileList);
  });
};

// mget

storage.mget = function (keys, callback) {
  callback(undefined, _.map(keys, function (key) {
    try {
      return fs.readFileSync(localFileName(key));
    } catch (e) {
      return undefined;
    }
  }));
};

module.exports = storage;
