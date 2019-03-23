import { Application } from 'egg';

export default (app: Application) => {
  const ctx = app.createAnonymousContext();

  class HttpClient extends app.HttpClient {};
  new HttpClient(app);

  class Controller extends app.Controller {};
  new Controller(ctx);

  class Service extends app.Service {};
  new Service(ctx);

  class Subscription extends app.Subscription {};
  new Subscription(ctx);

  class ContextHttpClient extends app.ContextHttpClient {};
  new ContextHttpClient(ctx);

  class ContextLogger extends app.ContextLogger {};
  new ContextLogger(ctx, app.logger);

  class ContextCookies extends app.ContextCookies {};
  new ContextCookies(ctx);
};
