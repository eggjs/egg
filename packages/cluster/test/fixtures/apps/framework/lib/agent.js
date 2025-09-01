const path = require('path');
const { Agent } = require('egg');

class FrameworkAgent extends Agent {
  get [Symbol.for('egg#eggPath')]() {
    return path.join(__dirname, '..');
  }
}

module.exports = FrameworkAgent;
