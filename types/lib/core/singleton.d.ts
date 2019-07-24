import { Application, EggAppConfig, PowerPartial } from 'egg';

export type SingletonConfig<C> = ({
  client: PowerPartial<C>,
} | {
  clients: {
    [prop: string]: PowerPartial<C>,
  };
}) & {
  default?: C,
};

export interface SingletonOptions<N extends string, T> {
  name: N;
  app: Application;
  create: (config: Config<N, T>, app: Application) => (T | Promise<T>);
}

type Config<N extends string, T> = EggAppConfig[SingletonOptions<N, T>['name']] extends SingletonConfig<infer P> ?  P : never;

declare class Singleton<N extends string, T> {
  constructor(options: SingletonOptions<N, T>);

  public init(): void | Promise<void>;

  public initSync(): void;

  public initAsync(): Promise<void>;

  public get(id: string): T;

  public createInstance(config: Config<N, T>): T;

  public createInstanceAsync(config: Config<N, T>): Promise<T>;
}

export default Singleton;
