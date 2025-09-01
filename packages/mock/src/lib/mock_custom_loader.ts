import { debuglog } from 'node:util';

const debug = debuglog('@eggjs/mock/lib/mock_custom_loader');

export function setCustomLoader(app: any) {
  const customLoader = app.config.customLoader;
  if (!customLoader) return;

  for (const field of Object.keys(customLoader)) {
    const loaderConfig = Object.assign({}, customLoader[field]);
    loaderConfig.field = field;
    addMethod(loaderConfig);
  }

  function addMethod(loaderConfig: any) {
    const field = loaderConfig.field as string;
    const appMethodName = 'mock' + field.replace(/^[a-z]/i, s => s.toUpperCase());
    if (app[appMethodName]) {
      app.coreLogger.warn('Can\'t override app.%s', appMethodName);
      return;
    }
    debug('[addMethod] %s => %j', appMethodName, loaderConfig);
    app[appMethodName] = function(service: any, methodName: string, fn: any) {
      if (typeof service === 'string') {
        const arr = service.split('.');
        service = loaderConfig.inject === 'ctx' ? this[field + 'Classes'] : this[field];
        for (const key of arr) {
          service = service[key];
        }
        service = service.prototype || service;
      }
      this._mockFn(service, methodName, fn);
      return this;
    };
  }
}
