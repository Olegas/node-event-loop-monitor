var monitor = require('./'),
   loopDone = false,
   afterTicks = 0,
   loopCount = 0;

setInterval(function dummy(){
   // just to keep prcess running
}, 100);

function loop() {
   console.log('Starting heavy loop #%d', loopCount);
   var s = +new Date();
   while (true) {
      if (+new Date() - s > 5000) {
         console.log('Heavy loop #%d is done', loopCount);
         loopCount++;
         if (loopCount < 5) {
            setImmediate(loop);
         } else {
            loopDone = true;
         }
         break;
      }
   }

}

monitor.on('data', function(latencyData) {
   console.log(JSON.stringify(latencyData, null, 2));
   if (loopDone) {
      afterTicks++;
      if (afterTicks > 3) {
         process.exit();
      }
   }
});

monitor.resume();

console.log('Waiting 10 sec and starting a 5 heavy loops');
setTimeout(function(){
   loop();
}, 10000);
