'use strict';

const pids = {
  master: process.ppid,
  worker: new Set(),
  agent: process.pid,
};

module.exports = function(agent) {
  // from parent
  agent.messenger.on('parent2agent', msg => console.log(msg));

  // send to parent
  process.send({
    action: 'agent2parent',
    data: 'agent -> parent',
    to: 'parent',
  });

  // send to app after they started
  agent.messenger.on('egg-ready', () => {
    agent.messenger.sendToApp('agent2app', 'agent -> app');
    // compatible with string
    process.send('agent2appbystring');
  });
  agent.messenger.on('app2agent', msg => console.log(msg));

  // compatible with string
  agent.messenger.on('app2agentbystring', msg => console.log('agent: ' + msg));

  agent.messenger.on('egg-ready', () => {
    agent.messenger.sendToApp('worker_online', { type: 'agent', pid: process.pid });
  });

  agent.messenger.on('worker_online', data => {
    workerOnline(data);
    sendToProcess(agent.messenger);
  });

  agent.messenger.on('send_to_pid', data => {
    if (data.type === 'app') {
      console.log('app sendTo agent done');
    }
    if (data.type === 'agent') {
      console.log('agent sendTo agent done');
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
  const data = { type: 'agent', fromProcess: process.pid };
  messenger.sendTo(pids.master, 'send_to_pid', data);
  messenger.sendTo(pids.agent, 'send_to_pid', data);
  for (const pid of pids.worker) {
    messenger.sendTo(pid, 'send_to_pid', data);
  }
}
