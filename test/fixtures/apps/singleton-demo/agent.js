'use strict';

const createDataService = require('./create');

module.exports = agent => {
  agent.addSingleton('dataService', createDataService);
};
