import * as Egg from 'yadan';

declare module 'egg' {
  interface Application {
    fromXiandan(): Promise<string>;
  }

  interface Context {
    fromXiandan(): Promise<string>;
  }

  interface EggAppConfig {
    XiandanType: string;
  }
}

declare module 'xiandan' {
  class XiandanApplication extends Application {
    superXiandan(): Promise<string>;
  }
}

export = Egg;