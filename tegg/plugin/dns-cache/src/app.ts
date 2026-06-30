import type { Application, ILifecycleBoot } from 'egg';

import { DnsResolver } from './lib/DnsResolver.ts';

export default class DnsCacheAppHook implements ILifecycleBoot {
  private readonly app: Application;
  private dnsResolver: DnsResolver;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad(): void {
    if (!this.app.config.dnsCache) {
      this.app.logger.warn('[tegg-dns-cache-plugin] DNS cache is disabled, please setup dnsCache config.');
    }
  }

  async configDidLoad(): Promise<void> {
    const config = this.app.config.dnsCache || {};

    // Create DNS resolver instance
    const useDNSResolver = config.mode !== 'lookup';
    const dnsCacheLogger = this.app.coreLogger;
    this.dnsResolver = new DnsResolver(
      {
        useResolver: useDNSResolver,
        servers: config.dnsServers,
        max: config.maxCacheLength || 1000,
        dnsCacheLookupInterval: config.lookupInterval || 10000,
        addressRotation: config.addressRotation !== false,
      },
      { logger: dnsCacheLogger },
    );

    const lookupFunction = this.dnsResolver.getLookupFunction();
    this.app.config.httpclient = this.app.config.httpclient || {};
    this.app.config.httpclient.lookup = lookupFunction;

    // Add dnsResolver to app
    this.app.dnsResolver = this.dnsResolver;
  }

  async didLoad(): Promise<void> {
    await this.app.moduleHandler.ready();
  }

  async beforeClose(): Promise<void> {
    // Cleanup DNS cache resources
    if (this.app.dnsResolver) {
      this.app.dnsResolver.resetCache();
    }
  }
}
