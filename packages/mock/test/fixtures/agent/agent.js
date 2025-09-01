const fs = require('fs');
const path = require('path');
const Client = require('./client');

module.exports = agent => {
  const done = agent.readyCallback('agent:agent');
  const p = path.join(__dirname, 'run/test.txt');
  fs.mkdirSync(path.join(__dirname, 'run'), { recursive: true });
  fs.writeFile(p, '123', done);

  agent.client = agent.cluster(Client).create();
};
