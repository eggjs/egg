'use strict';

const path = require('path');
const egg = require('../../../../../');
const Application = egg.Application;

class SimpleView {
  render(name, locals) {
    const html = `name=${name}, a=${locals.a}, b=${locals.b}, c=${locals.helper.testHelper()}`;
    return Promise.resolve(html);
  }

  renderString(tpl, locals) {
    const html = `tpl=${tpl}, a=${locals.a}, b=${locals.b}, c=${locals.helper.testHelper()}`;
    return Promise.resolve(html);
  }

  get helper() {
    return this.ctx.helper;
  }
}

class ViewApplication extends Application {
  constructor(options) {
    super(options);
  }

  get [Symbol.for('egg#eggPath')]() {
    return path.join(__dirname, '..');
  }

  get [Symbol.for('egg#view')]() {
    return SimpleView;
  }

}

module.exports = ViewApplication;
