import type { Next, ContextDelegation } from '../../lib/egg.js';

export interface NotFoundMiddlewareOptions {
  enable: boolean;
  pageUrl: string;
}

export default (options: NotFoundMiddlewareOptions) => {
  return async function notfound(ctx: ContextDelegation, next: Next) {
    await next();

    if (ctx.status !== 404 || ctx.body) {
      return;
    }

    // set status first, make sure set body not set status
    ctx.status = 404;

    if (ctx.acceptJSON) {
      ctx.body = {
        message: 'Not Found',
      };
      return;
    }

    const notFoundHtml = '<h1>404 Not Found</h1>';

    // notfound handler is unimplemented
    if (options.pageUrl && ctx.path === options.pageUrl) {
      ctx.body = `${notFoundHtml}<p><pre><code>config.notfound.pageUrl(${options.pageUrl})</code></pre> is unimplemented</p>`;
      return;
    }

    if (options.pageUrl) {
      ctx.realStatus = 404;
      ctx.redirect(options.pageUrl);
      return;
    }
    ctx.body = notFoundHtml;
  };
};
