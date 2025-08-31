const EggApplication = require('../egg').Application;
const utils = require('../../utils');

class Application extends EggApplication {
  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
  toJSON() {
    return {
      name: this.name,
      plugins: this.plugins,
      config: this.config,
    };
  }
}

const app = utils.createApp('application', { Application });
app.loader.loadAll();
app.ready(err => {
  process.exit(err ? 1 : 0);
});
