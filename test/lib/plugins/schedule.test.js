const assert = require('assert');
const path = require('path');
const fs = require('fs');
const utils = require('../../utils');

describe('test/lib/plugins/schedule.test.js', () => {
  it('should schedule work', async () => {
    const app = utils.cluster('apps/schedule', {
      workers: 2,
    });
    app.debug();
    app.coverage(false);
    await app.ready();
    await utils.sleep(7000);
    await app.close();
    const log = getLogContent('schedule');
    const count = contains(log, 'cron wow');
    assert(count >= 1);
    assert(count <= 2);

    // should support Subscription class on app.Subscription
    assert(contains(log, 'Info about your task') === 1);
  });
});

function getLogContent(name) {
  const logPath = path.join(__dirname, '../../fixtures/apps', name, 'logs', name, `${name}-web.log`);
  return fs.readFileSync(logPath, 'utf8');
}

function contains(content, match) {
  return content.split('\n').filter(line => line.indexOf(match) >= 0).length;
}
