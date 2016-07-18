'use strict';

const path = require('path');
const fs = require('fs');
const utils = require('../../utils');

describe.skip('test/lib/plugins/schedule.test.js', () => {
  it('should schedule work', function* () {
    const app = utils.cluster('apps/schedule', {
      workers: 4,
    });
    yield app.ready();
    yield sleep(5000);
    app.close();
    const log = getLogContent('schedule');
    // 由于 app.ready() 在 agent.ready 之后，ci 可能要耗太多时间导致多执行一次
    contains(log, 'cron').should.within(1, 2);
  });
});

function sleep(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

function getLogContent(name) {
  const logPath = path.join(__dirname, '../../fixtures/apps', name, 'logs', name, `${name}-web.log`);
  return fs.readFileSync(logPath, 'utf8');
}

function contains(content, match) {
  return content.split('\n').filter(line => line.indexOf(match) >= 0).length;
}
