'use strict';

const createDataService = require('./create').sync;
const createDataServiceAsync = require('./create').async;

module.exports = app => {
  app.addSingleton('dataService', createDataService);
  app.addSingleton('dataServiceAsync', createDataServiceAsync);
};
