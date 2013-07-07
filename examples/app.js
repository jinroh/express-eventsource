var express = require('express');
var expressEs = require('../lib/sse');

var sse = expressEs({
  maxConnexions: 2
});

var broadcast = sse.sender('foo');

var app = express()
  .use(sse.middleware())
  .listen(3000);

setInterval(function() {
  broadcast({ bar: 'baz' });
}, 2000);
