import { expectType } from 'tsd';
import { ContextDelegation, Application } from '../src/index.js';
import { HttpClient } from '../src/urllib.js';

const app = {} as Application;
const ctx = app.createAnonymousContext();

expectType<Promise<void>>(app.runInAnonymousContextScope(async ctx => {
  console.log(ctx);
}));

expectType<ContextDelegation>(ctx);
expectType<HttpClient>(ctx.httpClient);
