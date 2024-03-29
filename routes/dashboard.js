// dashboard.js

var express = require('express');
var router = express.Router();
var parameters = require('../lib/parameters');
const configuration = require('../lib/configuration');

router.get('/', function (req, res) {
  res.render('dashboard', {
    config: configuration,
    breadcrumbs: [
      { label: 'Home', uri: `${configuration.webPath}/` },
      { label: 'Dashboard' }
    ]
  });
})

module.exports = router;
