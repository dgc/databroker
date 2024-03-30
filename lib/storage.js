// Storage module

const _ = require('underscore');
const fs = require('fs');
const zlib = require("zlib");

var storage = new Object();
const dataDir = "data";

function localFileName(key) {
  return dataDir + "/" + key;
}

function loadLocalFile(key) {

  const fileName = localFileName(key);


  try {

    return fs.readFileSync(fileName)

  } catch(e) {

    try {
      if (e.code === "ENOENT") {
        return zlib.gunzipSync(fs.readFileSync(`${fileName}.gz`)).toString();
      }
    } catch {

      // Do nothing.
    }
  }

  return undefined;
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
    callback(undefined, loadLocalFile(key));
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

  const regexp = new RegExp(`^(${pattern})(.gz)?$`);

  let result = [];

  fs.readdir(dataDir, function (err, fileList) {

    for (const key of fileList) {

      const match = key.match(regexp);

      if (match !== null) {
        result.push(match[1]);
      }
    }

    callback(undefined, result);
  });
};

// mget

storage.mget = function (keys, callback) {
  callback(undefined, keys.map(function (key) {
    try {
      return loadLocalFile(key);
    } catch (e) {
      return undefined;
    }
  }));
};

module.exports = storage;
