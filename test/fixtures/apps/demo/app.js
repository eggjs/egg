'use strict';
const mm = require('egg-mock');
const assert = require('assert');
const utils = require('../../../utils');

class DemoAppTest {

  constructor(app) {
    this.app = app;

    // Add an attached variable exposed to the unit test
    this.app.triggerCount = 0;

    // Mock "lifecycle" function with a counter
    // Before calling "ready()"
    mm(this.app.lifecycle, 'triggerServerDidReady', () => {
      this.app.triggerCount++;
    });
  }

  configWillLoad() {
    this.app.config.tips = 'hello egg started';
  }

  async didReady() {
    // dynamic router
    this.app.all('/all', this.app.controller.home);
  }
}

module.exports = DemoAppTest;
