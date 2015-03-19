/**
 * Extension JS connect/express
 * Server-Sent Events implementation.
 * http://www.w3.org/TR/eventsource/
 * MIT Licensed
 */

var events = require('events');
var util = require('util');

/**
 * Message history size.
 */

var HISTORY_SIZE = 500;

/**
 * Ping interval.
 */
var PING_INTERVAL = 60000;


function sse(options) {

  options = options || {};
  var maxconn = options.connections  || Infinity;
  var maxsize = options.history      || HISTORY_SIZE;
  var pingint = options.pingInterval || PING_INTERVAL;


  var self    = Object.create(events.EventEmitter.prototype);
  var emitter = new events.EventEmitter();
  var history = [];
  var conns   = [];
  var uid     = -1;

  /**
   * Broadcasts a message to all clients.
   */
  function send(data, event) {
    if (typeof data === 'undefined') return;
    if (event && typeof event !== 'string') {
      throw new Error('event should be a string');
    }

    if (!event) event = 'message';

    var msg =
      'id:'    + (++uid) + '\n' +
      'event:' + (event) + '\n' +
      'data:'  + JSON.stringify(data);

    if (history.unshift(msg) > maxsize) {
      history.pop();
    }

    emitter.emit('write', msg);
    self.emit('send', event, data);
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
        res.write(msg + '\n\n');
      }


      /**
       * Clean ping and bound listeners.
       */
      function clean() {
        emitter.removeListener('write', write);
        emitter.removeListener('retry', retry);
        clearInterval(interval);

        self.emit('close', req, res);
      }


      /**
       * Send missed events
       */
      function missedEvents() {
        var i = Math.min(uid - last, history.length);
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

      if (options.turnover && conns.push(res) > maxconn) {
        var conn = conns.shift();
        process.nextTick(function() { conn.end(); });
      }


      // Send missed events if Last-Event-ID header is specified

      last = parseInt(req.get('Last-Event-ID'), 10);
      if (!isNaN(last)) {
        process.nextTick(missedEvents);
      }


      // Keep tcp connection open

      // Node.js 0.12 requires timeout argument be finite
      req.socket.setTimeout(0x7FFFFFFF);
      req.addListener('end',   clean); // closed by server
      req.addListener('close', clean); // closed by client


      // Bind message listener on write

      emitter.addListener('write', write);
      emitter.addListener('retry', retry);


      // Send a pings

      if (pingint > 0) {
        interval = setInterval(ping, Math.max(1000, pingint));
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.writeHead(200);
      res.write('\n\n');

      self.emit('open', req, res);

    } else {
      res.send(406, 'Should accept text/event-stream content.');
    }
  }

  // Public api

  self.middleware = function() { return middleware; };
  self.sender = sender;
  self.send = send;
  self.retry = retry;

  return self;
}

sse.create = function(options) {
  return sse(options);
};

exports = module.exports = sse;
