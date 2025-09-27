'use strict';

module.exports = agent => {
  agent.coreLogger.warn('agent warn');
  agent.coreLogger.error('agent error');
};
