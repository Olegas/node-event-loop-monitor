node-event-loop-monitor
=======================

NodeJS event loop latency monitor

Installation
------------

```
npm install event-loop-monitor --save
```

Usage
-----

```javascript
var monitor = require('event-loop-monitor');

// data event will fire every 4 seconds
monitor.on('data', function(latency) {
  console.log(latency); // { p50: 1026, p90: 1059, p95: 1076, p99: 1110, p100: 1260 }   
});

monitor.resume(); // to start measuring

// later...
monitor.stop(); // to stop measuring
```

What does it mean?
------------------

In example above this means that in last 4 seconds 50% of events is "late" by 1025 microseconds (1.025ms), 90% is late by 1059 microseconds (1.059ms) and so on.

CHANGELOG
--------

### 0.1.0

Removed `.unref()` from scanning interval. From now on, module will hold process running, until `.stop()` is called.
