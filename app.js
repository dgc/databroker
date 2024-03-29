var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var devices = require('./routes/devices');
var dashboard = require('./routes/dashboard');

var configuration = require('./lib/configuration');

var storeReadingsAndStatus = require('./lib/store_readings_and_status');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public') /*, { maxAge: 3600000 } */ ));

app.use('/', routes);
app.use('/users', users);
app.use('/devices', devices);
app.use('/dashboard', dashboard);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// socket.io handler

var counter = 0;
var subscriptions = {};

storeReadingsAndStatus.setSubscriptions(subscriptions);

io.on('connection', function (socket) {

    var state = counter++;
    var socket_subscriptions;

    function removeSubscriptions() {

      if (socket_subscriptions) {

        socket_subscriptions.forEach(function (device) {

          if (configuration.devices[device]) {

            if (subscriptions[device]) {

              var index = subscriptions[device].indexOf(socket);

              if (index != -1) {
                subscriptions[device].splice(index, 1);
              }
            }
          }
        });
      }
    }

    socket.on('devices', function (msg) {

        removeSubscriptions();

        socket_subscriptions = JSON.parse(msg);

        socket_subscriptions.forEach(function (device) {

          if (configuration.devices[device]) {

            if (!subscriptions[device]) {
              subscriptions[device] = [];
            }

            subscriptions[device].push(socket);
          }
        });
    });

    socket.on('disconnect', function () {
        removeSubscriptions();
    });
});


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            config: configuration,
            breadcrumbs: [ { label: 'Home', uri: '/' } ],
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        config: configuration,
        breadcrumbs: [ { label: 'Home', uri: '/' } ],
        message: err.message,
        error: {}
    });
});


module.exports = { app: app, server: server };
