import { type EggAppConfig } from 'egg';

export default function (): EggAppConfig {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
  };
  return config as unknown as EggAppConfig;
}
