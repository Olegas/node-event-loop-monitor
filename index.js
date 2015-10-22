// Hi-Res Mode
var
   time     = process.hrtime(),
   ticks    = [[0, 0]],
   interval = 10,
   CartesianTree = require('./lib/CartesianTree'),
   util = require("util"),
   events = require("events");

function EventLoopMonitor() {

   this._loopMonitor = null;
   this._counter = null;

   events.EventEmitter.call(this);
}

util.inherits(EventLoopMonitor, events.EventEmitter);

EventLoopMonitor.prototype.stop = function() {
   clearInterval(this._loopMonitor);
   clearInterval(this._counter);
};

EventLoopMonitor.prototype.resume = function(counterInterval) {

   var self = this;

   if (isNaN(counterInterval)) counterInterval = 4 * 1000;

   this.stop();

   this._loopMonitor = setInterval(function() {
      ticks.push(process.hrtime(time));
      if (ticks.length == 2) {
         time = process.hrtime();
         ticks[0] = [ticks[0][0] - ticks[1][0], ticks[0][1] - ticks[1][1]];
         ticks[1] = [0, 0];
      }
   }, interval);

   this._counter = setInterval(function() {

      var _ticks = ticks.reduce(function(obj, val, i){
         if (i > 0) {
            var key = Math.floor(((ticks[i][0] - ticks[i - 1][0]) * 1e9 + (ticks[i][1] - ticks[i - 1][1]) - interval * 1e6)/1e3);
            obj[key] = obj[key] || 0;
            obj[key]++;
         }
         return obj;
      }, {});

      var ct = new CartesianTree();
      for(var key in _ticks) {
         ct.add(parseInt(key, 10), _ticks[key]);
      }

      var json = ct.statByPercentile([0.5, 0.9, 0.95, 0.99, 1]);

      self.emit('data', {
         'p50'  : Math.floor(json[0.5].k  || 0),
         'p90'  : Math.floor(json[0.9].k  || 0),
         'p95'  : Math.floor(json[0.95].k || 0),
         'p99'  : Math.floor(json[0.99].k || 0),
         'p100' : Math.floor(json[1].k    || 0)
      });

      // https://www.scirra.com/blog/76/how-to-write-low-garbage-real-time-javascript
      /*
       * Assigning [] to an array is often used as a shorthand to clear it (e.g.
       * arr = [];), but note this creates a new empty array and garbages the old
       * one! It's better to write arr.length = 0; which has the same effect but
       * while re-using the same array object.
       */
      ticks[0] = ticks.pop();
      ticks.length = 1;
   }, counterInterval);

};

module.exports = new EventLoopMonitor();


