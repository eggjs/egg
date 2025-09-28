import type { EggAppConfig, PowerPartial } from 'egg';

export default function() {
  // built-in config
  const config: PowerPartial<EggAppConfig> = {};

  config.keys = '123123';

  config.customLoader = {
    myService: {
      directory: 'app/myService',
      inject: 'app',
    },
  };

  // biz config
  const bizConfig = {
    biz: {
      type: 'biz',
    },
  };

  return {
    ...config as {},
    ...bizConfig,
  };
}
