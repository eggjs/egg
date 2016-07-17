'use strict';

module.exports = agent => {
  agent.logger.info('agent info');
  agent.logger.error(new Error('agent error'));
};
