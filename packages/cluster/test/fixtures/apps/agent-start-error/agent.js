'use strict';

module.exports = agent => {
  const done = agent.readyCallback('prepare-agent');
  done(new Error('mock error'));
};
