import assert from 'node:assert';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import * as utils from './utils.ts';

describe('test/dns_cache_resolve.test.ts', () => {
  let app: MockApplication;
  let url = '';

  beforeAll(async () => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'apps', 'dns_cache_resolve'),
    });
    await app.ready();
    url = await utils.startLocalServer();
    // Only override resolver nameservers locally; in CI use the default resolver
    // so we don't depend on reaching public DNS (223.5.5.5).
    if (!process.env.CI) {
      try {
        app.dnsResolver.setServers(['223.5.5.5', '223.6.6.6']);
      } catch (error) {
        app.logger.error(`[dns-cache] Failed to set DNS servers: ${(error as Error).message}`);
      }
    }
  });
  afterAll(() => app.close());
  afterEach(() => mm.restore());

  it('should dns resolver exist', () => {
    assert(app.dnsResolver);
    assert(app.dnsResolver.getDnsCache());
  });

  it('should ctx.curl dns work', async () => {
    // Test with 127.0.0.1 (no DNS lookup needed for IP addresses)
    const result1 = await app.curl(url + '/get_headers', { method: 'GET' });
    assert(result1.status === 200);
    assert(result1.data);

    // Test with real domain name (requires DNS resolution)
    url = url.replace('127.0.0.1', 'localhost');
    const result2 = await app.curl(url + '/get_headers', { method: 'GET' });
    assert(result2.status === 200);
  });

  it('should throw error when the first dns lookup fail', async () => {
    await app
      .httpRequest()
      .get('/?url=' + encodeURIComponent('http://notexists-1111111local-domain.com'))
      .expect(500)
      .expect(/queryA (ENOTFOUND|ESERVFAIL) notexists-1111111local-domain\.com/);
  });
});
