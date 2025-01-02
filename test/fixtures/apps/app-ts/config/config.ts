import { EggAppConfig } from '../../../../../src/index.js';

export default () => {
  const config = {} as EggAppConfig;

  config.keys = 'foo';

  config.serverTimeout = 2 * 60 * 1000;

  config.customLoader = {
    model: {
      directory: 'app/model',
      inject: 'ctx',
    },
  };

  config.httpclient = {
    useHttpClientNext: false,
    request: {
      timing: true,
    },
  };

  return config;
}
