export default () => {
  const config = {
    keys: 'test key',
    logger: {
      level: 'DEBUG',
      consoleLevel: 'DEBUG',
    },
    httpclient: {
      httpAgent: {
        keepAlive: false,
        timeout: 30000,
      },
    },
    dnsCache: {
      mode: 'resolve',
      addressRotation: true,
    },
  };
  return config;
};
