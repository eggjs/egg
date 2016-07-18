'use strict';

const createDataService = require('./create');

module.exports = app => {
  app.addSingleton('dataService', createDataService);
};
