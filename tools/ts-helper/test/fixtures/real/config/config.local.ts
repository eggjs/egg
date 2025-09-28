import { EggAppConfig, PowerPartial } from 'egg';

export default function() {
  // built-in config
  const config: PowerPartial<EggAppConfig> = {};

  config.keys = '123123';

  config.biz = {
    type: 'local',
  };

  return config;
}
