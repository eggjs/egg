'use strict';

const path = require('path');
const mm = require('egg-mock');
const glob = require('glob');
const utils = require('../../utils');

describe.skip('test/lib/plugins/logrotater.test.js', () => {
  let app;
  before(() => {
    mm.env('unittest');
    app = utils.cluster('apps/logrotater-app', { coverage: true });
    return app.ready();
  });

  afterEach(mm.restore);

  after(() => app.close());

  it('should rotate log file default', done => {
    app.process.send({
      to: 'agent',
      action: 'test-reload-logger',
    });
    setTimeout(() => {
      const files = glob.sync(path.join(__dirname, '../../fixtures/apps/logrotater-app/logs/logrotater-app/*.log.*'));
      files.length.should.above(0);
      files.forEach(file => {
        file.should.match(/log.\d{4}-\d{2}-\d{2}$/);
      });
      done();
    }, 1000);
  });
});
