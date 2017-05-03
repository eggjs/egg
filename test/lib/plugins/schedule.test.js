'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const utils = require('../../utils');
const sleep = require('mz-modules/sleep');

describe('test/lib/plugins/schedule.test.js', () => {
  it('should schedule work', function* () {
    const app = utils.cluster('apps/schedule', {
      workers: 2,
    });
    yield app.ready();
    yield sleep(5000);
    yield app.close();
    const log = getLogContent('schedule');
    const count = contains(log, 'cron');
    assert(count >= 1);
    assert(count <= 2);
  });
});

function getLogContent(name) {
  const logPath = path.join(__dirname, '../../fixtures/apps', name, 'logs', name, `${name}-web.log`);
  return fs.readFileSync(logPath, 'utf8');
}

function contains(content, match) {
  return content.split('\n').filter(line => line.indexOf(match) >= 0).length;
}
