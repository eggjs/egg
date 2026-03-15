export default () => {
  const config = {} as any;
  config.keys = '123456';
  config.security = { csrf: { enable: false } };
  return config;
};
