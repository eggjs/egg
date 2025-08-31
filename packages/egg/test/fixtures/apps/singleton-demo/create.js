'use strict';

class DataService {
  constructor(config) {
    this.config = config;
  }

  async getConfig() {
    return this.config;
  }

  ready(done) {
    setTimeout(done, 1000);
  }
}

let count = 0;

exports.sync = (config, app) => {
  const done = app.readyCallback(`DataService-${count++}`);
  const dataService = new DataService(config);
  dataService.ready(done);
  return dataService;
};

exports.async = async (config, app) => {
  const done = app.readyCallback(`DataService-${count++}`);
  const dataService = new DataService(config);
  dataService.ready(done);
  return dataService;
};
