# Express EventSource

This express module creates a simple server-sent events room.

http://www.w3.org/TR/eventsource/

## Installation

```sh
$ npm install express-eventsource
```

## Example

```javascript
var express = require('express');
var eventsource = require('express-eventsource');

var sse = eventsource({
  connections: 2
});

var broadcast = sse.sender('foo');

var app = express()
  .use(sse.middleware())
  .listen(3000);

setInterval(function() {
  broadcast({ bar: 'baz' }); // <=> sse.send({ bar: 'baz' }, 'foo')
}, 2000);
```

(see `/examples`)

## License

License
(The MIT License)

Copyleft (<3) 2013 jinroh.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
