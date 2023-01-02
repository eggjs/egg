'use strict';

const assert = require('assert');

const fs = require('fs').promises;
const utils = require('../../utils');
const sleep = async ms => new Promise(resolve => setTimeout(resolve, ms));

describe('test/lib/plugins/logrotator.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/logrotator-app');
    return app.ready();
  });

  after(() => app.close());

  it('should rotate log file default', async () => {
    const file = require.resolve('egg-logrotator/app/schedule/rotate_by_file.js');
    console.log('job', file);
    await app.runSchedule(file);
    await sleep(1000);
    const files = (await fs.readdir(app.config.logger.dir)).filter(f => f.includes('.log.'));
    assert(files.length > 0);
    files.forEach(file => {
      assert(/\.log\.\d{4}-\d{2}-\d{2}$/.test(file));
    });
  });
});
