import { expectType } from 'tsd';
import { Context } from 'egg';
import { MockApplication, MockAgent, ResultObject } from '../src/index.js';
import { getBootstrapApp, mock, mm } from '../src/bootstrap.js';

const app = getBootstrapApp();
expectType<MockApplication>(app);
expectType<Context | undefined>(app.currentContext as Context);
expectType<Context | undefined>(app.ctxStorage.getStore() as Context);
expectType<MockApplication>(mock.app());
expectType<MockApplication>(mm.app());

expectType<MockAgent>(mm.app().mockAgent());

expectType<MockApplication>(mm.app().mockHttpclient('url', 'post', { data: 'ok' }));
expectType<MockApplication>(mm.app().mockHttpclient('url', 'post', 'data'));
expectType<MockApplication>(mm.app().mockHttpclient('url', {
  data: 'mock response',
  repeats: 1,
}));
expectType<MockApplication>(mm.app().mockHttpclient('url', (url) => {
  return url;
}));
expectType<MockApplication>(mm.app().mockHttpclient('url', 'post', (url) => {
  return url;
}));
expectType<MockApplication>(mm.app().mockHttpclient('url', 'get', {
  data: 'mock response',
  repeats: 1,
}));

expectType<void>(app.mockLog());
expectType<void>(app.mockLog('logger'));
expectType<void>(app.mockLog(app.logger));
expectType<void>(app.expectLog('foo string'));
expectType<void>(app.expectLog('foo string', 'coreLogger'));
expectType<void>(app.expectLog('foo string', app.coreLogger));
expectType<void>(app.expectLog(/foo string/));
expectType<void>(app.expectLog(/foo string/, 'coreLogger'));
expectType<void>(app.expectLog(/foo string/, app.coreLogger));
expectType<void>(mm.env('default'));
expectType<void>(mm.env('devserver'));

expectType<Promise<void>>(app.mockAgentRestore());
expectType<Promise<void>>(app.mockRestore());
expectType<Promise<void>>(app.mockContextScope(async () => {}));
expectType<Promise<void>>(app.mockContextScope(async _ctx => {}));

expectType<Promise<void>>(app.backgroundTasksFinished());

const result = {} as ResultObject;
expectType<number>(result.status!);
