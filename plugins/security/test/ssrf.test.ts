import dns from 'node:dns';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect, afterEach } from 'vitest';

import * as securityUtils from '../src/lib/utils.ts';
import { getFixtures } from './utils.ts';

let app: MockApplication;

describe('no ssrf config', () => {
  beforeAll(async () => {
    app = mm.app({ baseDir: getFixtures('apps/csrf') });
    await app.ready();
  });

  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should safeCurl work', async () => {
    const ctx = app.createAnonymousContext();
    const url = 'https://127.0.0.1';
    mm.data(app, 'curl', { data: 'response' });
    mm.data(app.agent, 'curl', { data: 'response' });
    mm.data(ctx, 'curl', { data: 'response' });

    let count = 0;
    function mockWarn(msg: string) {
      count++;
      expect(msg).toMatch(/please configure `config.security.ssrf` first/);
    }

    mm(app.logger, 'warn', mockWarn);
    mm(app.agent.logger, 'warn', mockWarn);
    mm(ctx.logger, 'warn', mockWarn);

    const r1 = await app.safeCurl(url);
    const r2 = await app.agent.safeCurl(url);
    const r3 = await ctx.safeCurl(url);
    expect(r1.data).toBe('response');
    expect(r2.data).toBe('response');
    expect(r3.data).toBe('response');
    expect(count).toBe(3);
  });
});

describe('ipBlackList', () => {
  beforeAll(async () => {
    app = mm.app({ baseDir: getFixtures('apps/ssrf-ip-black-list') });
    await app.ready();
  });

  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should safeCurl work', async () => {
    const urls = ['https://127.0.0.1/foo', 'http://10.1.2.3/foo?bar=1', 'https://0.0.0.0/', 'https://www.google.com/'];
    mm.data(dns, 'lookup', '127.0.0.1');
    const ctx = app.createAnonymousContext();

    for (const url of urls) {
      await checkIllegalAddressError(app, url);
      await checkIllegalAddressError(app.agent, url);
      await checkIllegalAddressError(ctx, url);
    }
  });
});

describe('checkAddress', () => {
  beforeAll(async () => {
    app = mm.app({ baseDir: getFixtures('apps/ssrf-check-address') });
    await app.ready();
  });

  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should safeCurl work', async () => {
    const urls = ['https://127.0.0.2/foo', 'https://www.google.com/foo'];
    mm.data(dns, 'lookup', '127.0.0.2');
    const ctx = app.createAnonymousContext();
    for (const url of urls) {
      await checkIllegalAddressError(app, url);
      await checkIllegalAddressError(app.agent, url);
      await checkIllegalAddressError(ctx, url);
    }
  });
});

describe('checkAddress with useHttpClientNext = true', () => {
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/ssrf-check-address-useHttpClientNext'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should safeCurl work', async () => {
    const urls = [
      'https://127.0.0.2/foo',
      // 'https://www.google.com/foo',
      'https://www.baidu.com/foo',
    ];
    mm.data(dns, 'lookup', '127.0.0.2');
    const ctx = app.createAnonymousContext();
    for (const url of urls) {
      await checkIllegalAddressError(app, url);
      await checkIllegalAddressError(app.agent, url);
      await checkIllegalAddressError(ctx, url);
    }
  });
});

describe('ipExceptionList', () => {
  beforeAll(async () => {
    app = mm.app({ baseDir: getFixtures('apps/ssrf-ip-exception-list') });
    await app.ready();
  });

  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should safeCurl work', async () => {
    const ctx = app.createAnonymousContext();
    const url = process.env.CI ? 'https://registry.npmjs.org' : 'https://registry.npmmirror.com';

    const r1 = await app.safeCurl<Record<string, string>>(url, {
      dataType: 'json',
    });
    const r2 = await app.agent.safeCurl(url, { dataType: 'json' });
    const r3 = await ctx.safeCurl(url, { dataType: 'json' });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    // console.log(r1.data);
  });

  it('should safeCurl block illegal address', async () => {
    const urls = [
      'https://127.0.0.1/foo',
      'http://10.1.2.3/foo?bar=1',
      'https://0.0.0.0/',
      // 'https://www.google.com/',
      // 'https://www.baidu.com/',
    ];
    mm.data(dns, 'lookup', '127.0.0.1');
    const ctx = app.createAnonymousContext();

    for (const url of urls) {
      await checkIllegalAddressError(app, url);
      await checkIllegalAddressError(app.agent, url);
      await checkIllegalAddressError(ctx, url);
    }
  });

  // TODO(fengmk2): should request the local server
  it.skip('should safeCurl allow exception ip ', async () => {
    const ctx = app.createAnonymousContext();
    const url = 'https://10.1.1.1';

    let count = 0;
    mm(app, 'curl', async (_url: string, options: any) => {
      options.checkAddress('10.1.1.1') && count++;
      return { data: 'response' };
    });
    mm(app.agent, 'curl', async (_url: string, options: any) => {
      options.checkAddress('10.1.1.1') && count++;
      return { data: 'response' };
    });
    mm(ctx, 'curl', async (_url: string, options: any) => {
      options.checkAddress('10.1.1.1') && count++;
      return { data: 'response' };
    });

    const r1 = await app.safeCurl<string>(url);
    const r2 = await app.agent.safeCurl(url);
    const r3 = await ctx.safeCurl(url);
    expect(r1.data).toBe('response');
    expect(r2.data).toBe('response');
    expect(r3.data).toBe('response');
    expect(count).toBe(3);
  });
});

describe('hostnameExceptionList', () => {
  beforeAll(async () => {
    app = mm.app({ baseDir: getFixtures('apps/ssrf-hostname-exception-list') });
    await app.ready();
  });

  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should safeCurl work', async () => {
    const ctx = app.createAnonymousContext();
    const host = process.env.CI ? 'registry.npmjs.org' : 'registry.npmmirror.com';
    const url = `https://${host}`;
    mm(app, 'curl', async (_url: string, options: any) => {
      options.checkAddress('10.0.0.1', 4, host);
      return 'response';
    });
    mm(app.agent, 'curl', async (_url: string, options: any) => {
      options.checkAddress('10.0.0.1', 4, host);
      return 'response';
    });
    mm(ctx, 'curl', async (_url: string, options: any) => {
      options.checkAddress('10.0.0.1', 4, host);
      return 'response';
    });

    await app.safeCurl(url, { dataType: 'json' });
    await app.agent.safeCurl(url, { dataType: 'json' });
    await ctx.safeCurl(url, { dataType: 'json' });
  });
});

describe('ipBlackList with ipv6 address', () => {
  function buildCheckAddress(ipBlackList: string[], ipExceptionList?: string[]) {
    const config: any = { ssrf: { ipBlackList, ipExceptionList } };
    securityUtils.preprocessConfig(config);
    return config.ssrf.checkAddress as (addresses: any, family: number | string, hostname: string) => boolean;
  }

  it('should block ipv6 address that is in the blacklist', () => {
    const checkAddress = buildCheckAddress(['::1/128', 'fd00::/8']);
    // resolved addresses are `{ address, family }` objects on Node.js >= 20
    expect(checkAddress([{ address: '::1', family: 6 }], 6, 'evil.example.com')).toBe(false);
    expect(checkAddress([{ address: 'fd12::3', family: 6 }], 6, 'evil.example.com')).toBe(false);
    // a public ipv6 address that is not blacklisted is still allowed
    expect(checkAddress([{ address: '2400:cb00::1', family: 6 }], 6, 'example.com')).toBe(true);
  });

  it('should block IPv4-mapped IPv6 address against IPv4 blacklist rules', () => {
    const checkAddress = buildCheckAddress(['127.0.0.1', '10.0.0.0/8']);
    expect(checkAddress([{ address: '::ffff:127.0.0.1', family: 6 }], 6, 'evil.example.com')).toBe(false);
    expect(checkAddress([{ address: '::ffff:10.1.2.3', family: 6 }], 6, 'evil.example.com')).toBe(false);
  });

  it('should respect ipExceptionList for ipv6 address', () => {
    const checkAddress = buildCheckAddress(['::/0'], ['::1/128']);
    // ::1 is in the exception list, allowed even though ::/0 blacklists everything
    expect(checkAddress([{ address: '::1', family: 6 }], 6, 'host')).toBe(true);
    // another ipv6 address is blocked by ::/0
    expect(checkAddress([{ address: 'fd00::1', family: 6 }], 6, 'host')).toBe(false);
  });
});

async function checkIllegalAddressError(instance: any, url: string) {
  try {
    await instance.safeCurl(url);
    throw new Error('should not execute');
  } catch (err: any) {
    expect(err.name).toBe('IllegalAddressError');
    expect(err.message).toMatch(/illegal address/);
  }
}
