'use strict';

const fs = require('fs');
const path = require('path');
const mm = require('egg-mock');

describe.skip('egg schedule example', () => {
  it('should schedule run schedule success', function* () {
    const baseDir = path.dirname(__dirname);
    const customEgg = path.join(baseDir, '../..');

    const app = mm.cluster({
      baseDir,
      customEgg,
      workers: 2,
    });

    yield app.ready();
    yield sleep(3000);
    const log = fs.readFileSync(path.join(baseDir, 'logs/egg-schedule-demo/egg-schedule-demo-web.log'), 'utf8');
    console.log(log);
    countLine(log, 'all&&cron').should.equal(2);
    countLine(log, 'all&&interval').should.equal(2);
    countLine(log, 'worker&&cron').should.equal(1);
    countLine(log, 'worker&&interval').should.equal(1);

    app.close();
  });
});

function sleep(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function countLine(content, key) {
  return content.split('\n').filter(line => line.indexOf(key) >= 0).length;
}
