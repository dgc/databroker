// cron.js

var dateformat = require('dateformat');
var timezone = 'America/Los_Angeles';

function today() {
  return dateformat(Date.now(), "yyyy-mm-dd");
}

function yesterday() {

  var today = new Date();
  var yesterday = new Date(today);

  yesterday.setDate(today.getDate() - 1);

  return dateformat(yesterday, "yyyy-mm-dd");
}

function enableCron(configuration) {
}

module.exports = enableCron;
