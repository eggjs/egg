const { EventEmitter } = require('node:events');

class Application extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.context = {};
    this.config = {};
    this.messenger = {
      messages: [],
      onMessage: (msg) => this.messenger.messages.push(msg),
    };
  }

  callback() {
    return (_req, res) => res.end('ok');
  }

  async ready() {
    this.readyAt = true;
  }

  async close() {}
}

exports.Application = Application;
