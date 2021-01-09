// From: http://stackoverflow.com/a/9050354

if (!Array.prototype.last) {
  Array.prototype.last = function () {
    return this[this.length - 1];
  };
};

const readings = {
  tp: { min: 0, max: 200 },
  sp: { min: 0, max: 200 },
  txo: { min: 0, max: 200 },
  sxo: { min: -5, max: 5 },
  syo: { min: -5, max: 5 },
  txo: { min: -5, max: 5 },
  tyo: { min: -5, max: 5 },
};

$('window').ready(function () {

  Object.keys(month_data).forEach(function (key) {

    var data = month_data[key];

    var columns = Object.keys(config.sensors);

    var data2 = {};

    columns.forEach(function (column) {

      data2[column] = [];

      data.forEach(function (row) {
        if (row[column]) {
          data2[column].push(
            {
              c: column,
              x: row.timestamp,
              l: row[column].l,
              h: row[column].h
            }
          );
        }
      });
    });

    // Split lines with missing chunks

    var splitReadings = [];

    columns.forEach(function (column) {

      var name = column;
      var values = data2[column];

      var gap = true;
      var lastTimestamp = undefined;

      for (var i = 0; i < values.length; i++) {

        if (lastTimestamp != undefined) {
          if (values[i] != undefined) {
            var diff = values[i].x - lastTimestamp;

            if (diff > (90 * 5)) {
              gap = true;
            }
          }
        }

        if (values[i] == undefined) {
          gap = true;
        } else {
          if (gap) {
            splitReadings.push({ name: name, values: []});
          }

          splitReadings.last().values.push(values[i]);
          lastTimestamp = values[i].x;
          gap = false;
        }
      }
    });

    var margin = { top: 0, right: 0, bottom: 0, left: 0 },
      width = 125 - margin.left - margin.right,
      height = 75 - margin.top - margin.bottom;

    var start_time = Date.parse(key) / 1000;
    var end_time = start_time + 86400;

    var x = d3.scale.linear()
      .domain([start_time, end_time])
      .range([0, width]);

    var yColumn = {};

    columns.forEach(function (column) {
      yColumn[column] = d3.scale.linear()
        .domain([readings[column].min, readings[column].max])
        .range([height, 0]);
    });

console.log(yColumn);
    var color = d3.scale.category10();
    color.domain(columns);

    var area = d3.svg.area()
      .x(function (d) { return x(d.x); })
      .y0(function (d) { return yColumn[d.c](d.h); })
      .y1(function (d) { return yColumn[d.c](d.l); });

    var svg = d3.select('#day-' + key).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    splitReadings.forEach(function (segment) {
      svg.append("path")
        .datum(segment.values)
        .style("stroke", function (d) { return color(segment.name); })
        .style("fill", function (d) { return color(segment.name); })
        .attr("class", "area")
        .attr("d", area);
    });
  });
});
