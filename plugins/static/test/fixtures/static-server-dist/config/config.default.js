module.exports = info => {
  return {
    keys: 'test key',
    static: {
      prefix: '/static',
      dir: info.baseDir + '/dist/static',
      buffer: true,
    },
  };
};
