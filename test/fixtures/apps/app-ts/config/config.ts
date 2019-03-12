import { EggAppConfig } from 'egg';

export default () => {
  const config = {} as EggAppConfig;

  config.keys = 'foo';

  config.serverTimeout = 2 * 60 * 1000;

  config.customLoader = {
    directory: 'app/model',
    inject: 'ctx',
  };

  return config;
}
