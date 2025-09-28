import { defineConfigFactory, type PartialEggConfig } from 'egg';

export default defineConfigFactory(appInfo => {
  const config = {
    keys: 'multipart-ts-test',
    appInfo: appInfo,
    multipart: {
      mode: 'file',
    },
  } as PartialEggConfig;
  return config;
});
