const { sleep } = require('../../../../utils');

module.exports = app => {
  app.get('/', async function() {
    this.logger.debug('hi %s %s', this.method, this.url);
    // wait for writing to file
    await sleep(1000);
    this.body = 'ok';
  });
};
