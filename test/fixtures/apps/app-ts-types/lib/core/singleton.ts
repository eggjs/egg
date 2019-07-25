import Singleton from 'egg/lib/core/singleton';
import { Application } from 'egg';

const app = new Application();

interface Foo {
  name: string;
  value: number;
}

declare module 'egg' {
  interface EggAppConfig {
    foo: {
      client: PowerPartial<Foo>,
    },
    bar: {
      default: string,
    },
    baz: {
      clients: {
        foo: PowerPartial<Foo>,
        bar: PowerPartial<Foo>,
      }
    }
  }
}

new Singleton({
  name: 'foo',
  app,
  create: (config, app) => {
    config.name;
    app.use;
  },
});

const multi = new Singleton({
  name: 'baz',
  app,
  create: (config, app) => {
    config.name;
    app.use;
    return 'string';
  },
});
multi.get('foo').toString;

app.addSingleton('bar', (config, app) => {
  config.toString;
  app.use;
});

app.addSingleton('baz', (config, app) => {
  config.value;
  app.use;
});
