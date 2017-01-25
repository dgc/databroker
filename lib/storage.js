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
  fs.open(localFileName(key), "r", function (err, fd) {
    callback(err, !err);
  });
};

// get

storage.get = function(key, callback) {
  fs.readFile(localFileName(key), function (err, value) {
    if (err) {
      callback(err, undefined);
    } else {
      callback(undefined, value)
    }
  });
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