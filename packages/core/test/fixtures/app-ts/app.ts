import * as assert from 'assert';
import * as path from 'path';
const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');
import {
  BaseContextClass,
  EggCore,
  EggCoreOptions,
  EggLoader,
  EggLoaderOptions,
} from '../../..';

// normal
const app = new EggCore<{ env: string }>();
assert(app.Controller);
assert(app.Service);
assert(app.baseDir);
assert(app.loader.ContextLoader);
assert(app.loader.FileLoader);
assert(app.loader.app === app);
assert(app.loader.eggPaths.length === 0);
assert(app.type);

// custom egg core
class CustomEggCore extends EggCore {
  constructor(options: EggCoreOptions) {
    super(options);
  }

  get [EGG_PATH]() {
    return __dirname;
  }

  customFn() {
    console.info(this.config);
  }
}
const customApp = new CustomEggCore({ baseDir: undefined });
customApp.customFn();
assert(customApp.Controller);
assert(customApp.Service);
assert(customApp.loader.ContextLoader);
assert(customApp.loader.FileLoader);

// base class
new BaseContextClass({ app: {} });

// ready & close
(async function test() {
  const app2 = new EggCore({
    baseDir: path.resolve(__dirname, '../app-getter/'),
  });
  assert(app2.type === 'application');
  assert(app2.name === 'app-getter');
  assert(app2.plugins === app.loader.plugins);
  app2.beforeClose(() => {});
  app2.beforeStart(() => {});
  const result = await app2.toAsyncFunction<{ env: number }>(function* () {
    return yield { env: 1 };
  })();
  assert(result.env === 1);
  await app2.toPromise([
    function* () {
      yield {};
    },
    function* () {
      yield {};
    },
  ]);
  await app2.ready();
  await app2.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});

// load methods
class MyEgg extends EggCore {
  get [EGG_LOADER]() {
    return MyLoader;
  }

  get [EGG_PATH]() {
    return __dirname;
  }
}
class MyLoader extends EggLoader {
  constructor(opt: EggLoaderOptions) {
    super(opt);
    this.loadPlugin();
    this.loadConfig();
    this.loadApplicationExtend();
    this.loadAgentExtend();
    this.loadRequestExtend();
    this.loadResponseExtend();
    this.loadContextExtend();
    this.loadHelperExtend();
    this.loadCustomAgent();
    this.loadService();
    this.loadController({ ignore: ['**/node_module'] });
    this.loadRouter();
    this.loadMiddleware({ ignore: ['**/node_module'] });
  }
}
const app3 = new MyEgg({ baseDir: path.resolve(__dirname, '../app-getter/') });
assert(app3.plugins === app3.loader.plugins);
assert(app3.config === app3.loader.config);
assert(app3.deprecate);
app3.deprecate('is deprecate');

// loadTo
const app4 = { context: {} } as any;
const baseDir = path.join(__dirname, '../load_to_app');
const directory = path.join(baseDir, 'app/model');
const loader = new EggLoader({
  baseDir,
  app: app4,
  logger: console as any,
});
loader.loadToApp(directory, 'model');
assert(app4.model.user);
loader.loadToContext(directory, 'model');
assert(app4.context.model.user);

// loadTo with options
const app5 = { context: {} } as any;
const baseDir2 = path.join(__dirname, '../load_dirs');
const loader2 = new EggLoader({
  baseDir: baseDir2,
  app: app5,
  logger: console as any,
});
loader2.loadToApp('dao', 'dao', { match: '**/test*.js', caseStyle: 'lower' });
assert(app5.dao);
loader2.loadToContext('dao', 'dao', {
  caseStyle: 'lower',
  ignore: ['testFunction.js', 'testReturnFunction.js'],
});
assert(app5.context.dao);
assert(loader2.loadFile(path.resolve(baseDir2, './dao/testFunction')));
assert(
  loader2.loadFile(path.resolve(baseDir2, './dao/testFunction'), { abc: 123 })
);

// file loader
const FileLoader = loader.FileLoader;
const app6 = {} as any;
new FileLoader({
  directory: path.join(__dirname, '../load_dirs'),
  target: app6,
  match: ['dao/*'],
  caseStyle: 'upper',
  filter(obj) {
    return !!obj;
  },
  initializer(obj, options) {
    assert(options.path);
    assert(options.pathName);
    return obj;
  },
}).load();
assert(app6.Dao.TestClass);
assert(app6.Dao.TestFunction);

// custom file loader
const app9 = {} as any;
class CustomFileLoader extends FileLoader {
  test() {
    assert(this.load);
    assert(this.parse);
  }
}
new CustomFileLoader({
  directory: path.join(__dirname, '../load_dirs'),
  target: app9,
  match: ['dao/*'],
  caseStyle: 'upper',
  filter(obj) {
    return !!obj;
  },
  initializer(obj, options) {
    assert(options.path);
    assert(options.pathName);
    return obj;
  },
}).test();

// context loader
const ContextLoader = loader.ContextLoader;
const app7 = { context: {} } as any;
new ContextLoader({
  directory: path.join(__dirname, '../load_dirs'),
  property: 'kick',
  fieldClass: 'ass',
  inject: app7,
  match: ['dao/*'],
  caseStyle: 'upper',
  filter(obj) {
    return !!obj;
  },
  initializer(obj, options) {
    assert(options.path);
    assert(options.pathName);
    return obj;
  },
}).load();
assert(app7.ass.Dao.TestClass);
assert(app7.ass.Dao.TestFunction);
assert(app7.context.kick.Dao.TestClass);
assert(app7.context.kick.Dao.TestFunction);

// custom context loader
const app8 = { context: {} } as any;
class CustomContextLoader extends ContextLoader {
  test() {
    this.load();
    assert(this.parse);
  }
}
new CustomContextLoader({
  directory: path.join(__dirname, '../load_dirs'),
  property: 'kick',
  fieldClass: 'ass',
  inject: app8,
  match: ['dao/*'],
  caseStyle: 'upper',
  filter(obj) {
    return !!obj;
  },
  initializer(obj, options) {
    assert(options.path);
    assert(options.pathName);
    return obj;
  },
}).test();
