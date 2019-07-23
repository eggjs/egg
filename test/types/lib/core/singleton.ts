import Singleton, { ISingletonConfig } from 'egg/lib/core/singleton';
import { Application } from 'egg';

const app = new Application();

interface Foo {
  name: string;
  value: number;
}

declare module 'egg' {
  interface EggAppConfig {
    foo: ISingletonConfig<Foo>;
    bar: ISingletonConfig<string>;
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
