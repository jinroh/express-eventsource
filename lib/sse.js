/**
 * Extension JS connect/express
 * Server-Sent Events implementation.
 * http://www.w3.org/TR/eventsource/
 * MIT Licensed
 */

var events = require('events');

/**
 * Message history size.
 */

var HISTORY_SIZE = 500;

/**
 * Maximum number of concurrent connections.
 */

var MAX_CONNECTIONS = 100;

/**
 * Ping interval.
 */
var PING_INTERVAL = 60000;


exports = module.exports = sse;


function sse(options) {
  var maxconn = options.maxConnexions || MAX_CONNECTIONS;
  var maxsize = options.historySize   || HISTORY_SIZE;
  var pingint = options.pingInterval  || PING_INTERVAL;

  var emitter = new events.EventEmitter();
  var history = [];
  var ress    = [];
  var uid     = -1;

  /**
   * Broadcasts a message to all clients.
   */
  function send(data, event) {
    if (typeof data === 'undefined') { return; }
    if (event && typeof event !== 'string') {
      throw new Error('event should be a string');
    }

    var msg = {
      id:    ++uid,
      event: event || 'message',
      data:  JSON.stringify(data)
    };

    if (history.unshift(msg) > maxsize) {
      history.pop();
    }

    emitter.emit('message', msg);
  }

  /**
   * Curried send function on a specific event
   */
  function sender(event) {
    return function(data) {
      send(data, event);
    };
  }

  /**
   * Sends a retry command (parameter in seconds)
   */
  function retry(i) {
    i = Math.abs(parseInt(i, 10));
    if (i >= 0) {
      emitter.emit('retry', i);
    }
  }

  function middleware(req, res, next) {
    var last, interval;

      /**
       * Write message data in tcp stream.
       */
      function write(msg) {
        res.write([
          'id:'    + msg.id,
          'event:' + msg.event,
          'data:'  + msg.data
        ].join('\n') + '\n\n');
      }


      /**
       * Clean ping and bound listeners.
       */
      function clean() {
        emitter.removeListener('message', write);
        emitter.removeListener('retry', retry);
        clearInterval(interval);
      }


      /**
       * Send missed events
       */
      function missedEvents() {
        var i = Math.min(Math.max(0, uid - last), history.length);
        while (--i >= 0) {
          write(history[i]);
        }
      }


      /**
       * Send a ping in the tcp stream.
       */
      function ping() {
        res.write(':\n');
      }


      /**
       * Send a retry command.
       */
      function retry(i) {
        res.write('retry:' + i);
      }

    if (req.accepts('text/event-stream')) {

      // Turnover if the connection threshold is exceeded

      if (ress.push(res) > maxconn) {
        process.nextTick(function() { ress.shift().send(); });
      }


      // Send missed events if Last-Event-ID header is specified

      last = parseInt(req.get('Last-Event-ID'), 10);
      if (!isNaN(last)) {
        process.nextTick(missedEvents);
      }


      // Keep tcp connection open

      req.socket.setTimeout(Infinity);
      req.addListener('end',   clean); // closed by server
      req.addListener('close', clean); // closed by client


      // Bind message listener on write

      emitter.addListener('message', write);
      emitter.addListener('retry', retry);


      // Send a pings

      if (pingint > 0) {
        interval = setInterval(ping, Math.max(1000, pingint));
      }

      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive'
      });
      res.write('\n\n');

    } else {
      res.send(406, 'Should accept text/event-stream content.');
    }
  }

  // Public api

  return {
    middleware: function() { return middleware; },
    send:       send,
    sender:     sender,
    retry:      retry
  };
}
