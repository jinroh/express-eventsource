var express = require('express');
var eventsource = require('../lib/sse');

var sse = eventsource({
  connections: 2
});

var broadcast = sse.sender('foo');

var app = express()
  .use(sse.middleware())
  .listen(3000);

setInterval(function() {
  broadcast({ bar: 'baz' });
}, 2000);
