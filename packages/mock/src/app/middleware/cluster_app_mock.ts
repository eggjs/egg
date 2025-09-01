import { debuglog } from 'node:util';
import { Context, Next } from '@eggjs/core';

const debug = debuglog('@eggjs/mock/app/middleware/cluster_app_mock');

export default () => {
  return async function clusterAppMock(ctx: Context, next: Next) {
    // use originalUrl to make sure other middlewares can't change request url
    if (ctx.originalUrl !== '/__egg_mock_call_function') {
      return next();
    }
    const body = (ctx.request as any).body;
    debug('%s %s, body: %j', ctx.method, ctx.url, body);
    const { method, property, args, needResult } = body;
    if (!method) {
      ctx.status = 422;
      ctx.body = {
        success: false,
        error: 'Missing method',
      };
      return;
    }
    if (args && !Array.isArray(args)) {
      ctx.status = 422;
      ctx.body = {
        success: false,
        error: 'args should be an Array instance',
      };
      return;
    }
    if (property) {
      // method: '__getter__' and property: 'config'
      if (method === '__getter__') {
        if (!ctx.app[property]) {
          debug('property %s not exists on app', property);
          ctx.status = 422;
          ctx.body = {
            success: false,
            error: `property "${property}" not exists on app`,
          };
          return;
        }
        ctx.body = { success: true, result: ctx.app[property] };
        return;
      }

      if (!ctx.app[property] || typeof (ctx.app as any)[property][method] !== 'function') {
        debug('property %s.%s not exists on app', property, method);
        ctx.status = 422;
        ctx.body = {
          success: false,
          error: `method "${method}" not exists on app.${property}`,
        };
        return;
      }
    } else {
      if (typeof ctx.app[method] !== 'function') {
        debug('method %s not exists on app', method);
        ctx.status = 422;
        ctx.body = {
          success: false,
          error: `method "${method}" not exists on app`,
        };
        return;
      }
    }

    debug('call %s with %j', method, args);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg && typeof arg === 'object') {
        // convert __egg_mock_type back to function
        if (arg.__egg_mock_type === 'function') {
          // eslint-disable-next-line
          args[i] = eval(`(function() { return ${arg.value} })()`);
        } else if (arg.__egg_mock_type === 'error') {
          const err: any = new Error(arg.message);
          err.name = arg.name;
          err.stack = arg.stack;
          for (const key in arg) {
            if (key !== 'name' && key !== 'message' && key !== 'stack' && key !== '__egg_mock_type') {
              err[key] = arg[key];
            }
          }
          args[i] = err;
        }
      }
    }

    const target: any = property ? ctx.app[property] : ctx.app;
    const fn = target[method];
    try {
      Promise.resolve(fn.call(target, ...args)).then(result => {
        ctx.body = needResult ? { success: true, result } : { success: true };
      });
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: err.message };
    }
  };
};
