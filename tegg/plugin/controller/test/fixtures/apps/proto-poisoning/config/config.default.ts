export default () => {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
    bodyParser: {
      onProtoPoisoning: 'remove',
    },
  };
  return config;
};
