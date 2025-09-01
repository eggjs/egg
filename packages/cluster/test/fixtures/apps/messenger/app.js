'use strict';

const pids = {
  master: process.ppid,
  worker: new Set([ process.pid ]),
  agent: null,
};

module.exports = function(app) {
  // from parent
  app.messenger.on('parent2app', msg => console.log(msg));

  // send to parent
  process.send({
    action: 'app2parent',
    data: 'app -> parent',
    to: 'parent',
  });

  // send to app
  app.messenger.sendToAgent('app2agent', 'app -> agent');
  app.messenger.on('agent2app', msg => console.log(msg));

  // compatible with string
  process.send('app2agentbystring');
  app.messenger.on('agent2appbystring', msg => console.log('app: ' + msg));

  app.messenger.on('egg-ready', () => {
    app.messenger.sendToAgent('worker_online', { type: 'app', pid: process.pid });
  });

  app.messenger.on('worker_online', data => {
    workerOnline(data);
    sendToProcess(app.messenger);
  });

  app.messenger.on('send_to_pid', data => {
    if (data.type === 'app') {
      console.log('app sendTo app done');
    }
    if (data.type === 'agent') {
      console.log('agent sendTo app done');
    }
  });
};

function workerOnline(data) {
  if (data.type === 'agent') {
    pids.agent = data.pid;
  } else {
    pids.worker.add(data.pid);
  }
}

function sendToProcess(messenger) {
  const data = { type: 'app', fromProcess: process.pid };
  messenger.sendTo(pids.agent, 'send_to_pid', data);
  messenger.sendTo(pids.master, 'send_to_pid', data);
  for (const pid of pids.worker) {
    messenger.sendTo(pid, 'send_to_pid', data);
  }
}
