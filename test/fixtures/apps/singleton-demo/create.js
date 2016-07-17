'use strict';

class DataService {
  constructor(config) {
    this.config = config;
  }

  * getConfig() {
    return this.config;
  }

  ready(done) {
    setTimeout(done, 1000);
  }
}

let count = 0;
module.exports = function create(config, app) {
  const done = app.readyCallback(`DataService-${count++}`);
  const dataService = new DataService(config);
  dataService.ready(done);
  return dataService;
};
