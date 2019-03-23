'use strict';

const createDataService = require('./create').sync;
const createDataServiceAsync = require('./create').async;

module.exports = agent => {
  agent.addSingleton('dataService', createDataService);
  agent.addSingleton('dataServiceAsync', createDataServiceAsync);
};
