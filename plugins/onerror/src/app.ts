import http from 'node:http';
import fs from 'node:fs';

import { onerror, type OnerrorOptions, type OnerrorError } from 'koa-onerror';
import type { ILifecycleBoot, Application, Context } from 'egg';

import { ErrorView } from './lib/error_view.ts';
import { isProd, detectStatus, detectErrorMessage, accepts } from './lib/utils.ts';
import type { OnerrorConfig } from './config/config.default.ts';

export interface OnerrorErrorWithCode extends OnerrorError {
  code?: string;
  type?: string;
  errors?: any[];
}

export default class Boot implements ILifecycleBoot {
  private app: Application;
  constructor(app: Application) {
    this.app = app;
  }

  async didLoad() {
    // logging error
    const config = this.app.config.onerror;
    const viewTemplate = fs.readFileSync(config.templatePath, 'utf8');
    const app = this.app;
    app.on('error', (err, ctx) => {
      if (!ctx) {
        ctx = app.currentContext || app.createAnonymousContext();
      }
      if (config.appErrorFilter && !config.appErrorFilter(err, ctx)) return;

      const status = detectStatus(err);
      // 5xx
      if (status >= 500) {
        try {
          ctx.logger.error(err);
        } catch (ex) {
          app.logger.error(err);
          app.logger.error(ex);
        }
        return;
      }

      // 4xx
      try {
        ctx.logger.warn(err);
      } catch (ex) {
        app.logger.warn(err);
        app.logger.error(ex);
      }
    });

    const errorOptions: OnerrorOptions = {
      // support customize accepts function
      accepts(this: Context) {
        const fn = config.accepts || accepts;
        return fn(this as any);
      },

      html(err, ctx: Context) {
        const status = detectStatus(err);
        const errorPageUrl =
          typeof config.errorPageUrl === 'function' ? config.errorPageUrl(err, ctx) : config.errorPageUrl;

        // keep the real response status
        ctx.realStatus = status;
        // don't respond any error message in production env
        if (isProd(app)) {
          // 5xx
          if (status >= 500) {
            if (errorPageUrl) {
              const statusQuery = (errorPageUrl.indexOf('?') > 0 ? '&' : '?') + `real_status=${status}`;
              return ctx.redirect(errorPageUrl + statusQuery);
            }
            ctx.status = 500;
            ctx.body = `<h2>Internal Server Error, real status: ${status}</h2>`;
            return;
          }
          // 4xx
          ctx.status = status;
          ctx.body = `<h2>${status} ${http.STATUS_CODES[status]}</h2>`;
          return;
        }
        // show simple error format for unittest
        if (app.config.env === 'unittest') {
          ctx.status = status;
          ctx.body = `${err.name}: ${err.message}\n${err.stack}`;
          return;
        }

        const errorView = new ErrorView(ctx, err, viewTemplate);
        ctx.body = errorView.toHTML();
      },

      json(err: OnerrorErrorWithCode, ctx: Context) {
        const status = detectStatus(err);
        let errorJson: Record<string, any> = {};

        ctx.status = status;
        const code = err.code ?? err.type;
        const message = detectErrorMessage(ctx, err);

        if (isProd(app)) {
          // 5xx server side error
          if (status >= 500) {
            errorJson = {
              code,
              // don't respond any error message in production env
              message: http.STATUS_CODES[status],
            };
          } else {
            // 4xx client side error
            // addition `errors`
            errorJson = {
              code,
              message,
              errors: err.errors,
            };
          }
        } else {
          errorJson = {
            code,
            message,
            errors: err.errors,
          };

          if (status >= 500) {
            // provide detail error stack in local env
            errorJson.stack = err.stack;
            errorJson.name = err.name;
            for (const key in err) {
              if (!errorJson[key]) {
                errorJson[key] = (err as any)[key];
              }
            }
          }
        }

        ctx.body = errorJson;
      },

      js(err, ctx: Context) {
        errorOptions.json!.call(ctx, err, ctx);

        if (typeof ctx.createJsonpBody === 'function') {
          ctx.createJsonpBody(ctx.body);
        }
      },
    };

    // support customize error response
    const keys: (keyof OnerrorConfig)[] = ['all', 'html', 'json', 'text', 'js'];
    for (const type of keys) {
      if (config[type]) {
        Reflect.set(errorOptions, type, config[type]);
      }
    }
    onerror(app, errorOptions);
  }
}
