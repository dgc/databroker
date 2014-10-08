// Script to consume the log file from rPI_46_1047_1

var device = "rPI_46_1047_1";

var sensor1 = "10-000802b42b40";
var sensor2 = "10-000802b44f21";
var sensor3 = "10-000802b49201";
var sensor4 = "10-000802b4b181";

var redis = require("redis");
var client = redis.createClient();

var fs = require('fs');
var filename = process.argv[2];
var readline = require('readline');
var sprintf = require("sprintf-js").sprintf;

function logResult(key_bits, value) {
  var key = key_bits.join(" ");
  client.set(key, value);
}

readline.createInterface({

  input: fs.createReadStream(filename),
  terminal: false

}).on('line', function(line) {

  bits = line.match(/(\d+)\t(\d+)\t(\d+)\t(\d+)\t(\d+)/)

  if (bits) {
    
    var date = new Date(parseInt(bits[1], 10) * 1000);

    var base = sprintf("%04d-%02d-%02d %02d:%02d:%02d", date.getFullYear(),
        date.getMonth(), date.getDay(), date.getHours(), date.getMinutes(),
        date.getSeconds());

    logResult([base, device, sensor1], bits[2]);
    logResult([base, device, sensor2], bits[3]);
    logResult([base, device, sensor3], bits[4]);
    logResult([base, device, sensor4], bits[5]);
  }
}).on('close', function() {

  client.quit();
});
