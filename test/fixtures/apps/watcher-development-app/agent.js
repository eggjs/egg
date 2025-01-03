const path = require('node:path');

const file_path1 = path.join(__dirname, 'tmp-agent.txt');
const dir_path = path.join(__dirname, 'tmp-agent');

module.exports = function(agent) {
  let count = 0;
  function listener() {
    count++;
  }

  agent.messenger.on('i-want-agent-file-changed-count', function() {
    agent.messenger.broadcast('agent-file-changed-count', count);
  });

  agent.messenger.on('agent-watch', function() {
    agent.watcher.watch([file_path1, dir_path], listener);
    agent.messenger.broadcast('agent-watch-success', 'agent watch success');
  });
};
