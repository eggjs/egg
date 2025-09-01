'use strict';

module.exports = agent => {
  const done = agent.readyCallback('prepare-agent');
  done(new Error('worker_threads mock error'));
};
