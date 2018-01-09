'use strict';

const assert = require('assert');

const path = require('path');
const glob = require('glob');
const utils = require('../../utils');

describe('test/lib/plugins/logrotator.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/logrotator-app');
    return app.ready();
  });

  after(() => app.close());

  it('should rotate log file default', async () => {
    const file = require.resolve('egg-logrotator/app/schedule/rotate_by_file.js');
    await app.runSchedule(file);
    const files = glob.sync(path.join(app.config.logger.dir, '*.log.*'));
    assert(files.length > 0);
    files.forEach(file => {
      assert(/\.log\.\d{4}-\d{2}-\d{2}$/.test(file));
    });
  });
});
