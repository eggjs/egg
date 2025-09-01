'use strict';

console.log('worker1 [%s] started', process.pid);

setTimeout(() => {
  console.log('worker1 alived');
}, 4000);

setInterval(() => {
  // keep alive
}, 100000);

process.on('SIGTERM', () => {
  console.log('worker1 on sigterm and exit');
  process.exit(0);
});
