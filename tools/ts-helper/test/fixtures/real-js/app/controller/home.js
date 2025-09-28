const { Controller } = require('egg');

module.exports = class HomeController extends Controller {
  async index() {
    this.ctx.renderBody('123');
  }
}