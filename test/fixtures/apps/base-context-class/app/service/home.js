module.exports = app => {
  return class HomeController extends app.Service {
    async show() {
      this.ctx.body = 'hello';
      this.logger.debug('debug');
      this.logger.info('appname: %s', this.config.name);
      this.logger.warn('warn');
      this.logger.error(new Error('some error'));
    }
  }
}
