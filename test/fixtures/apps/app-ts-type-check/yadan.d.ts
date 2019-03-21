import * as Egg from 'egg';

declare module 'egg' {
  interface Application {
    fromYadan(): Promise<string>;
  }

  interface Context {
    fromYadan(): Promise<string>;
  }

  interface EggAppConfig {
    yadanType: string;
  }
}

declare module 'yadan' {
  class YadanApplication extends Application {
    superYadan(): Promise<string>;
  }
}

export = Egg;