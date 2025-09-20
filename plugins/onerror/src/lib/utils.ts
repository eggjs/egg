import type { Context, Application } from 'egg';
import type { OnerrorError } from 'koa-onerror';

export function detectErrorMessage(ctx: Context, err: OnerrorError) {
  // detect json parse error
  if (err.status === 400 &&
      err.name === 'SyntaxError' &&
      ctx.request.is('application/json', 'application/vnd.api+json', 'application/csp-report')) {
    return 'Problems parsing JSON';
  }
  return err.message;
}

export function detectStatus(err: OnerrorError) {
  // detect status
  let status = err.status || 500;
  if (status < 200) {
    // invalid status consider as 500, like urllib will return -1 status
    status = 500;
  }
  return status;
}

export function accepts(ctx: Context) {
  if (ctx.acceptJSON) return 'json';
  if (ctx.acceptJSONP) return 'js';
  return 'html';
}

export function isProd(app: Application) {
  return app.config.env !== 'local' && app.config.env !== 'unittest';
}
