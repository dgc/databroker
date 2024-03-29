var express = require('express');
var router = express.Router();
const config = require('../lib/configuration');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { config: config, breadcrumbs: [ { label: 'Home' } ] });
});

module.exports = router;
