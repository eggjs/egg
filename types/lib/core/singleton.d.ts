import { Application, EggAppConfig, PowerPartial } from 'egg';

interface DefaultSingletonConfig<C> {
  default: C;
}

interface SingleClientConfig<C> {
  client: PowerPartial<C>;
  default?: C;
}

interface MultiClientConfig<C> {
  clients: {
    [prop: string]: PowerPartial<C>,
  };
  default?: C;
}

type SingletonConfig<C> = DefaultSingletonConfig<C> | SingleClientConfig<C> | MultiClientConfig<C>;

type Config<N extends string> = EggAppConfig[N] extends SingletonConfig<infer P> ?  P : never;

type Creator<T, N extends string> = (config: Config<N>, app: Application) => (T | Promise<T>);

export interface SingletonOptions<T, N extends string> {
  name: N;
  app: Application;
  create: Creator<T, N>;
}

type MultiClientKeys<N extends string> = EggAppConfig[N] extends MultiClientConfig<infer P> ? (keyof EggAppConfig[N]['clients']) : string;

declare class Singleton<T, N extends string = string> {
  constructor(options: SingletonOptions<T, N>);

  public init(): void | Promise<void>;

  public initSync(): void;

  public initAsync(): Promise<void>;

  public get(id: MultiClientKeys<N>): T;

  public createInstance(config: Config<N>): T;

  public createInstanceAsync(config: Config<N>): Promise<T>;
}

export default Singleton;
