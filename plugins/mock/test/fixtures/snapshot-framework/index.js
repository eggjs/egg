const egg = require('egg');

class Application extends egg.Application {
  callback() {
    // Model middleware composition that captures the current list, as koa-compose 4.2 does.
    const middleware = this.middleware;
    this.middleware = [...middleware];
    try {
      return super.callback();
    } finally {
      this.middleware = middleware;
    }
  }
}

exports.Application = Application;
exports.Agent = egg.Agent;
