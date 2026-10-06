export default () => {
  const config = {
    keys: 'test key',
    logger: {
      level: 'DEBUG',
      consoleLevel: 'NONE',
    },
    httpclient: {
      // Force a fresh connection per request so the custom DNS lookup runs every
      // time; otherwise undici reuses the pooled socket and skips lookup, leaving
      // the resolver cache unpopulated (flaky under urllib v4).
      request: {
        reset: true,
      },
      httpAgent: {
        keepAlive: false,
        timeout: 30000,
      },
    },
    dnsCache: {
      mode: 'lookup',
      lookupInterval: 3000,
      addressRotation: true,
    },
  };
  return config;
};
