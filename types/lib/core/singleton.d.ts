import { Application, EggAppConfig, PowerPartial } from 'egg';

export type ISingletonConfig<C> = ({
  client: PowerPartial<C>,
} | {
  clients: {
    [prop: string]: PowerPartial<C>,
  };
}) & {
  default?: C,
};

export interface ISingletonOptions<N extends string, T> {
  name: N;
  app: Application;
  create: (config: IConfig<N, T>, app: Application) => (T | Promise<T>);
}

type IConfig<N extends string, T> = EggAppConfig[ISingletonOptions<N, T>['name']] extends ISingletonConfig<infer P> ?  P : never;

declare class Singleton<N extends string, T> {
  constructor(options: ISingletonOptions<N, T>);

  public init(): void | Promise<void>;

  public initSync(): void;

  public initAsync(): Promise<void>;

  public get(id: string): T;

  public createInstance(config: IConfig<N, T>): T;

  public createInstanceAsync(config: IConfig<N, T>): Promise<T>;

  private _extendDynamicMethods(client: T);
}

export default Singleton;
