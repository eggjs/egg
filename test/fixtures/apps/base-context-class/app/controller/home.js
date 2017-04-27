'use strict';

module.exports = app => {
  return class HomeController extends app.Controller {
    * show() {
      yield this.service.home.show();
      this.ctx.body = 'hello';
      this.logger.debug('debug');
      this.logger.info('appname: %s', this.config.name);
      this.logger.warn('warn');
      this.logger.error(new Error('some error'));
    }

    getPathName() {
      this.ctx.body = this.pathName;
    }

    getConfig() {
      this.ctx.body = this.config.name;
    }
  };
}
