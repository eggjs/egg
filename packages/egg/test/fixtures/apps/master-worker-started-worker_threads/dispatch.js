const egg = require('../../../..');
const baseDir = __dirname;

egg.startCluster({
  startMode: 'worker_threads',
  workers: 1,
  baseDir,
});
