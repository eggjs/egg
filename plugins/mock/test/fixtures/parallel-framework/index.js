const { EventEmitter } = require('node:events');

class Application extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.context = {};
    this.config = {};
    this.errors = [];
    this.messenger = {
      messages: [],
      onMessage: (msg) => this.messenger.messages.push(msg),
    };
  }

  callback() {
    const ready = this.readyAt;
    return (_req, res) => {
      res.statusCode = ready ? 200 : 503;
      res.end(ready ? 'ok' : 'not ready');
    };
  }

  async ready() {
    if (this.options.readyError) {
      this.emit('error', this.options.readyError);
      throw this.options.readyError;
    }
    this.readyAt = true;
  }

  onerror(err) {
    this.errors.push(err);
  }

  async close() {}
}

exports.Application = Application;
