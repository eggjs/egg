module.exports = app => {
  app.get('/', async function () {
    this.app.loggers.bizLogger.warn('hi biz logger');
    this.app.loggers.relativeLogger.warn('hi relative logger');
    this.body = 123;
  });
};
