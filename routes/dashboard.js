// dashboard.js

var express = require('express');
var router = express.Router();
var parameters = require('../lib/parameters');

router.get('/', function (req, res) {
  res.render('dashboard', {
    breadcrumbs: [
      { label: 'Home', uri: '/graphs/' },
      { label: 'Dashboard' }
    ]
  });
})

module.exports = router;
