
$('window').ready(function() {

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
              x: row.timestamp,
              l: row[column].l,
              h: row[column].h
            }
          );
        }
      });
    });

    var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = 125 - margin.left - margin.right,
        height = 75 - margin.top - margin.bottom;

    var start_time = Date.parse(key) / 1000;
    var end_time = start_time + 86400;

    var x = d3.scale.linear()
        .domain([start_time, end_time])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([17000, 23000])
        .range([height, 0]);

    var color = d3.scale.category10();
    color.domain(columns);

    var area = d3.svg.area()
        .x(function(d) { return x(d.x); })
        .y0(function(d) { return y(d.h); })
        .y1(function(d) { return y(d.l); });

    var svg = d3.select('#day-' + key).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    columns.forEach(function (column) {
      svg.append("path")
          .datum(data2[column])
          .style("stroke", function(d) { return color(column); })
          .style("fill", function(d) { return color(column); })
          .attr("class", "area")
          .attr("d", area);
    });
  });
});

