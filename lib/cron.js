// cron.js

var dateformat = require('dateformat');
var timezone = 'America/Los_Angeles';
var updateThumbnail = require('../lib/update_thumbnail');

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

  var CronJob = require('cron').CronJob

  new CronJob('0 * * * * *', function () {
    updateThumbnail('rPI_46_1047_1', today(), configuration, function () {
      updateThumbnail('rPI_46_1047_2', today(), configuration, function () {
      });
    });
  }, null, true, timezone);

  new CronJob('0 * * * * *', function () {
    console.log("Yesterday = " + yesterday());
//   updateThumbnail('rPI_46_1047_1', yesterday(), configuration, function () {
//     updateThumbnail('rPI_46_1047_2', yesterday(), configuration, function () {
//     });
//   });
  }, null, true, timezone);
}

module.exports = enableCron;
