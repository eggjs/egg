export default appInfo => {
  const config: any = {};

  // should change to your own
  config.keys = appInfo.name + '_1513135333623_4128';

  config.customLoader = {
    custom3: {
      directory: 'app/custom3',
      inject: 'app',
    },
  };

  return config;
};
