const path = require('node:path');

module.exports = app => {
  app.get('/log', async function () {
    this.logger.warn('%s %s', this.method, this.path);
    this.logger.error(new Error('error'));
    this.body = {
      method: this.method,
      path: this.path,
    };
  });

  app.get('/rotate', async function () {
    const schedule = path.join(__dirname, '../../../../src/app/schedule/rotate_by_file.ts');
    await app.runSchedule(schedule);
    this.body = 'done';
  });
};
