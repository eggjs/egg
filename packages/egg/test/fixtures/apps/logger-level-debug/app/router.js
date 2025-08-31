const { scheduler } = require('node:timers/promises');

module.exports = app => {
  app.get('/', async function() {
    this.logger.debug('hi %s %s', this.method, this.url);
    // wait for writing to file
    await scheduler.wait(1000);
    this.body = 'ok';
  });
};
