// Functions for converting raw sensor data.

function convert_data(data, config) {

  function compareNumbers(a, b) {
    return a - b;
  }

  function closest_minute(s) {
    return Math.floor((s + 30) / 60) * 60;
  }

  function set_second_value(results, timestamp, sensor_id, value) {

    var minute = closest_minute(timestamp);

    if (results[timestamp] == undefined) {
      results[timestamp] = { Time: timestamp };
    }

    results[timestamp][sensor_id] = value;
  }

  function set_minute_value(results, timestamp, sensor_id, value) {

    var minute = closest_minute(timestamp);

    if (results[minute] == undefined) {
      results[minute] = { Time: minute };
    }

    results[minute][sensor_id] = value;
  }

  var results = {};

  Object.keys(config.sensors).forEach(function (sensor_id) {

    switch (config.sensors[sensor_id].sensor_model) {

      case "RHT03":
      case "DS18B20": {
        data.forEach(function (entry) {
          set_minute_value(results, entry["timestamp"], sensor_id, entry[sensor_id] / 1000);
        });
      }
      break;

      case "YF-S201": {
        data.forEach(function (entry) {
          set_minute_value(results, entry["timestamp"], sensor_id, entry[sensor_id] / (60 * 7.5));
        });
      }
      break;

      case "CurrentCostTIAM": {

        data.forEach(function (entry) {

          var msg = entry["message"];
          
          var sensorOpen = msg.indexOf("<sensor>");
          var sensorClose = msg.indexOf("</sensor>");

          if ((sensorOpen == -1) || (sensorClose == -1))
            return;

          var sensor = msg.substring(sensorOpen + 8, sensorClose);

          if (sensor != sensor_id)
            return;

          var wattsOpen = msg.indexOf("<watts>");
          var wattsClose = msg.indexOf("</watts>");

          if ((wattsOpen == -1) || (wattsClose == -1))
            return;

          var watts = msg.substring(wattsOpen + 7, wattsClose);

          set_minute_value(results, entry["timestamp"], sensor_id, parseInt(watts));
        });
      }
      break;
    }
  });

  var timestamps = [];

  Object.keys(results).forEach(function (id) {
    timestamps.push(results[id].Time);
  });

  var sorted_timestamps = timestamps.sort(compareNumbers);

  var sorted_results = [];

  sorted_timestamps.forEach(function (timestamp) {

    var entry = results[timestamp];
    entry["Time"] = new Date(entry["Time"] * 1000);
    sorted_results.push(entry);
  });

  // console.log(sorted_results);

  return sorted_results;
}
