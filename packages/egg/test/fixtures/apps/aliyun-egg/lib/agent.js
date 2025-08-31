'use strict';

const path = require('path');
const egg = require('../../../../..');
const Agent = egg.Agent;
const AppWorkerLoader = egg.AppWorkerLoader;

class MyAgent extends Agent {

  constructor(options) {
    super(options);
  }

  get [Symbol.for('egg#eggPath')]() {
    return path.join(__dirname, '..');
  }
}

module.exports = MyAgent;
