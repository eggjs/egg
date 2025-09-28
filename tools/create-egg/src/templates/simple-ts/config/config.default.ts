import { defineConfigFactory, type PartialEggConfig } from 'egg';

export default defineConfigFactory(appInfo => {
  const config = {
    // use for cookie sign key, should change to your own and keep security
    keys: appInfo.name + '_{{keys}}',

    // add your egg config in here
    middleware: [] as string[],
  } as PartialEggConfig;

  // add your special config in here
  const bizConfig = {
    sourceUrl: `https://github.com/eggjs/examples/tree/master/${appInfo.name}`,
  };

  // the return config will combines to EggAppConfig
  return {
    ...config,
    ...bizConfig,
  };
});
