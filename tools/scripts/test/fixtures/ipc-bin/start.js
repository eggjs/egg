'use strict';

const co = require('co');

const BaseStartCommand = require('../../../lib/cmd/start');

class StartCommand extends BaseStartCommand {
  *run(context) {
    yield super.run(context);
    const child = this.child;
    child.on('message', (msg) => {
      if (msg && msg.action === 'egg-ready') {
        console.log('READY!!!');
      }
    });
  }
}

const start = new StartCommand();

co(function* () {
  yield start.run({
    argv: {
      framework: 'custom-framework',
      _: [process.env.BASE_DIR],
      workers: 2,
      title: 'egg-server-example',
    },
    cwd: process.env.BASE_DIR,
    // FIXME: overide run argv so execArgvObj is missing
    // execArgv: [],
    env: {
      PATH: process.env.PATH,
    },
  });
});
