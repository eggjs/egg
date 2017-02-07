'use strict';

const utils = require('../../../utils');
const file_path1 = utils.getFilepath('apps/watcher-development-app/tmp-agent.txt');
const dir_path = utils.getFilepath('apps/watcher-development-app/tmp-agent');

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
