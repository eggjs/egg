import Singleton, { SingletonConfig } from 'egg/lib/core/singleton';
import { Application } from 'egg';

const app = new Application();

interface Foo {
  name: string;
  value: number;
}

declare module 'egg' {
  interface EggAppConfig {
    foo: SingletonConfig<Foo>;
    bar: SingletonConfig<string>;
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

app.addSingleton('bar', (config, app) => {
  config.toString;
  app.use;
});
