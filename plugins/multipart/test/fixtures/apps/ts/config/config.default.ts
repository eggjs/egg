import { EggAppInfo, EggAppConfig } from 'egg';

/**
 * Powerful Partial, Support adding ? modifier to a mapped property in deep level
 * @example
 * import { PowerPartial, EggAppConfig } from 'egg';
 *
 * // { view: { defaultEngines: string } } => { view?: { defaultEngines?: string } }
 * type EggConfig = PowerPartial<EggAppConfig>
 */
export type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends object ? PowerPartial<T[U]> : T[U];
};

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = 'multipart-ts-test';

  config.appInfo = appInfo;

  config.multipart = {
    mode: 'file',
  };

  return config;
};
