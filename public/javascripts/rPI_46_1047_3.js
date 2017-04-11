
function lineGraph(graphSettings) {

  function storeGraphSettings() {

    var settings = graphSettings.defaults;

    graphSettings.columns.forEach(function(id) {
      settings.visible[id] = d3.select(graphSettings.selector + " #vis-" + id).property("checked");
    });

    ['min_y', 'max_y', 'start_time', 'end_time'].forEach(function (key) {
      var val = d3.select(graphSettings.selector + " #" + key).node().value;
      settings[key] = val;
    });

    localStorage.setItem(graphSettings.settings_id, JSON.stringify(settings));
  }

  function useSettings() {
    storeGraphSettings();
    renderGraph();
  }

  function resetSettings() {
    localStorage.clear(graphSettings.settings_id);
    renderGraph();
  }

  function setLineVisibility(id) {

    var checked = d3.select(graphSettings.selector + " #vis-" + id).property("checked");

    var el = d3.select(graphSettings.selector + " #path-" + id);

    if (checked) {
      el.style("display", null);
    } else {
      el.style("display", "none");
    }
  }

  function toggleLineVisibility(id) {
    setLineVisibility(id);
    storeGraphSettings();
  }

  function renderGraph() {

    var settings = localStorage.getItem(graphSettings.settings_id);

    if (settings == undefined) {
      settings = graphSettings.defaults;
    } else {
      settings = JSON.parse(settings);
    }

    var width = graphSettings.width - graphSettings.margin.left - graphSettings.margin.right;
    var height = graphSettings.height - graphSettings.margin.top - graphSettings.margin.bottom;
    var start_time = graphSettings.day + (settings.start_time * 3600000);
    var end_time = graphSettings.day + (settings.end_time * 3600000);

    var convertedData = graphSettings.data.filter(function (el) {
      var this_time = +(el[graphSettings.timeProperty]);
      return ((this_time >= start_time) && (this_time <= end_time));
    });

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = graphSettings.color;

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    if (graphSettings.xTicks) {
      xAxis.ticks(graphSettings.xTicks);
    }

    if (graphSettings.yTicks) {
      yAxis.ticks(graphSettings.yTicks);
    }

    var line = d3.svg.line()
        .interpolate("basis")
        .x(function(d) { return x(d.xValue); })
        .y(function(d) { return y(d.yValue); });

    d3.select(graphSettings.selector + " > *").remove();

    d3.select(graphSettings.selector).html("<div id='graph'></div><div id='legend'><div class='legend'><h3>Legend</h3><div id='keys'></div></div><h3>Controls</h3><div id='controls'></div></div>");

    var svg = d3.select(graphSettings.selector + " > div#graph").append("svg")
        .attr("width", width + graphSettings.margin.left + graphSettings.margin.right)
        .attr("height", height + graphSettings.margin.top + graphSettings.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + graphSettings.margin.left + "," + graphSettings.margin.top + ")");

    var gridGroup = svg.append("g");

    color.domain(graphSettings.columns);

    var readings = graphSettings.columns.map(function(name) {

      var values = convertedData.map(function(d) {
        return {xValue: d[graphSettings.timeProperty], yValue: +d[name]};
      })

      values = values.filter(function (value) {
        return !isNaN(value.yValue);
      });

      return {
        name: name,
        values: values
      };
    });

    x.domain(d3.extent(convertedData, function(d) { return d[graphSettings.timeProperty]; }));

    x.domain([start_time, end_time]);
    y.domain([settings.min_y, settings.max_y]);

    var reading = svg.selectAll(".reading")
        .data(readings)
        .enter()
        .append("g")
        .attr("class", "reading")
        .append("path")
        .attr("class", "line visTarget")
        .attr("id", function(d) { return "path-" + d.name })
        .attr("d", function(d) { return line(d.values); })
        .style("stroke", function(d) { return color(d.name); })

    // Axes

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)

      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(graphSettings.yAxisLabel);

    // Draw a grid

    var yAxisGrid = yAxis.tickSize(width, 0)
      .tickFormat("")
      .orient("right");

    var xAxisGrid = xAxis.tickSize(-height, 0)
      .tickFormat("")
      .orient("top");

    gridGroup.append("g")
      .classed('y', true)
      .classed('grid', true)
      .call(yAxis);

    gridGroup.append("g")
      .classed('x', true)
      .classed('grid', true)
      .call(xAxis);













    d3.select(graphSettings.selector + " div#controls > div").remove();

    var controlsElement = d3.select(graphSettings.selector + " div#controls");

    controlsElement.append("div").html("<table>" +
        "<tr><th>Min Y</th><td><input id='min_y'></input></td></tr>" +
        "<tr><th>Max Y</th><td><input id='max_y'></input></td></tr>" +

        "<tr><th>Start time</th><td><select id='start_time'>" +
        "<option value='0'>00:00</option>" +
        "<option value='1'>01:00</option>" +
        "<option value='2'>02:00</option>" +
        "<option value='3'>03:00</option>" +
        "<option value='4'>04:00</option>" +
        "<option value='5'>05:00</option>" +
        "<option value='6'>06:00</option>" +
        "<option value='7'>07:00</option>" +
        "<option value='8'>08:00</option>" +
        "<option value='9'>09:00</option>" +
        "<option value='10'>10:00</option>" +
        "<option value='11'>11:00</option>" +
        "<option value='12'>12:00</option>" +
        "<option value='13'>13:00</option>" +
        "<option value='14'>14:00</option>" +
        "<option value='15'>15:00</option>" +
        "<option value='16'>16:00</option>" +
        "<option value='17'>17:00</option>" +
        "<option value='18'>18:00</option>" +
        "<option value='19'>19:00</option>" +
        "<option value='20'>20:00</option>" +
        "<option value='21'>21:00</option>" +
        "<option value='22'>22:00</option>" +
        "<option value='23'>23:00</option>" +
        "</select></td></tr>" +

        "<tr><th>End time</th><td><select id='end_time'>" +
        "<option value='1'>01:00</option>" +
        "<option value='2'>02:00</option>" +
        "<option value='3'>03:00</option>" +
        "<option value='4'>04:00</option>" +
        "<option value='5'>05:00</option>" +
        "<option value='6'>06:00</option>" +
        "<option value='7'>07:00</option>" +
        "<option value='8'>08:00</option>" +
        "<option value='9'>09:00</option>" +
        "<option value='10'>10:00</option>" +
        "<option value='11'>11:00</option>" +
        "<option value='12'>12:00</option>" +
        "<option value='13'>13:00</option>" +
        "<option value='14'>14:00</option>" +
        "<option value='15'>15:00</option>" +
        "<option value='16'>16:00</option>" +
        "<option value='17'>17:00</option>" +
        "<option value='18'>18:00</option>" +
        "<option value='19'>19:00</option>" +
        "<option value='20'>20:00</option>" +
        "<option value='21'>21:00</option>" +
        "<option value='22'>22:00</option>" +
        "<option value='23'>23:00</option>" +
        "<option value='24' selected>00:00</option>" +
        "</select></td></tr>" +

        "</table>" +
        "<input class='update' type='button' value='Update'></input> " +
        "<input class='reset' type='button' value='Reset'></input>");


     controlsElement.select(graphSettings.selector + ' input.update')
       .on('click', useSettings);

     controlsElement.select(graphSettings.selector + ' input.reset')
       .on('click', resetSettings);

  // Legend

  {
    var legendKeys = d3.select(graphSettings.selector + " div#keys");

    legendKeys.selectAll("*").remove();

    var readings = graphSettings.columns.map(function(name) {
      legendKeys.append("div").html("<label><span style='color: " + graphSettings.color(name) + "'>&#9632;</span> <input type='checkbox' id='vis-" + name + "'> " + config.sensors[name].label + "</label>");
    });

    legendKeys.selectAll("input")
      .data(graphSettings.columns)
      .on('change', function(name) { toggleLineVisibility(name); });
  }

    var defaults = graphSettings.defaults;

    ['min_y', 'max_y', 'start_time', 'end_time'].forEach(function (key) {
      if (settings[key] == undefined) {
        settings[key] = defaults[key];
      }

      d3.select(graphSettings.selector + " #" + key).node().value = settings[key];
    });

    graphSettings.columns.forEach(function(id) {
      d3.select("#vis-" + id)
        .property('checked', settings.visible[id] != false);

      setLineVisibility(id);
    });

    Object.keys(defaults).forEach(function (key) {
      if (settings[key] == undefined) {
        settings[key] = defaults[key];
      }
    });

    if (graphSettings.post_render) {
      graphSettings.post_render(svg);
    }
  }

  renderGraph();
}

$('window').ready(function() {

  lineGraph({
    settings_id: "rPI_46_1047_3",
    selector: "div.graph_container",
    color: d3.scale.category10(),
    width: 860,
    height: 600,
    day: today,
    timeProperty: "Time",
    margin: {
      top: 20,
      right: 50,
      bottom: 30,
      left: 50
    },
    yAxisLabel: "Power (Watts)",
    columns: [

      "1",
      "2",
      "3",
      "4",
      "5",
      "6",

    ],

    data: convert_data_for_day_view(data, config),

    defaults: {
      visible: {},
      min_y: 0,
      max_y: 3000,
      start_time: 0,
      end_time: 24,
    },
  });

});

