export default appInfo => {
  const config: any = {};

  // should change to your own
  config.keys = appInfo.name + '_1513135333623_4128';

  config.customLoader = {
    custom: {
      directory: 'app/custom',
      inject: 'ctx',
    },

    custom2: {
      directory: 'app/custom2',
      inject: 'app',
    },

    custom4: {
      directory: 'app/custom4',
      inject: 'anyother',
    },

    custom5: {
      directory: 'app/custom5',
      inject: 'ctx',
      tsd: false,
    },

    custom6: {
      inject: 'ctx',
    },
  };

  return config;
};
