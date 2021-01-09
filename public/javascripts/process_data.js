// Functions for converting raw sensor data.

function convert_data_for_day_view(data, config) {

  function compareNumbers(a, b) {
    return a - b;
  }

  function closest_minute(s) {
    return Math.floor((s + 30) / 60) * 60;
  }

  function closest_hour(s) {
    return Math.floor((s + 1800) / 3600) * 3600;
  }

  function set_value(results, timestamp, sensor_id, value, period) {

    var time;
    
    switch (period) {
      case "minute": time = closest_minute(timestamp); break;
      case "hour": time = closest_hour(timestamp); break;
      default: throw "Unknown period unit (" + period + ") for sensor: " + sensor_id;
    }

    if (results[time] == undefined) {
      results[time] = { Time: time };
    }

    results[time][sensor_id] = value;
  }

  var results = {};

  Object.keys(config.sensors).forEach(function (sensor_id) {

    var sensor_config = config.sensors[sensor_id];

    switch (sensor_config.sensor_model) {

      case "RHT03":
      case "DS18B20": {
        data.forEach(function (entry) {
          set_value(results, entry["timestamp"], sensor_id, entry[sensor_id] / 1000, sensor_config.period_unit);
        });
      }
      break;

      case "YF-S201": {
        data.forEach(function (entry) {
          set_value(results, entry["timestamp"], sensor_id, entry[sensor_id] / (60 * 7.5), sensor_config.period_unit);
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

          set_value(results, entry["timestamp"], sensor_id, parseInt(watts), sensor_config.period_unit);
        });
      }
      break;

      default: {
        data.forEach(function (entry) {
          set_value(results, entry["timestamp"], sensor_id, entry[sensor_id], sensor_config.period_unit);
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

  return sorted_results;
}
