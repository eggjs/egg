import dns from 'node:dns';
import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/ssrf.test.ts', () => {
  let app: MockApplication;
  afterEach(mm.restore);

  describe('no ssrf config', () => {
    before(() => {
      app = mm.app({ baseDir: 'apps/csrf' });
      return app.ready();
    });

    after(() => app.close());

    it('should safeCurl work', async () => {
      const ctx = app.createAnonymousContext();
      const url = 'https://127.0.0.1';
      mm.data(app, 'curl', { data: 'response' });
      mm.data(app.agent, 'curl', { data: 'response' });
      mm.data(ctx, 'curl', { data: 'response' });

      let count = 0;
      function mockWarn(msg: string) {
        count++;
        assert.match(msg, /please configure `config.security.ssrf` first/);
      }

      mm(app.logger, 'warn', mockWarn);
      mm(app.agent.logger, 'warn', mockWarn);
      mm(ctx.logger, 'warn', mockWarn);

      const r1 = await app.safeCurl(url);
      const r2 = await app.agent.safeCurl(url);
      const r3 = await ctx.safeCurl(url);
      assert(r1.data === 'response');
      assert(r2.data === 'response');
      assert(r3.data === 'response');
      assert(count === 3);
    });
  });

  describe('ipBlackList', () => {
    before(() => {
      app = mm.app({ baseDir: 'apps/ssrf-ip-black-list' });
      return app.ready();
    });

    after(() => app.close());

    afterEach(() => {
      void mm.restore();
    });

    it('should safeCurl work', async () => {
      const urls = [
        'https://127.0.0.1/foo',
        'http://10.1.2.3/foo?bar=1',
        'https://0.0.0.0/',
        'https://www.google.com/',
      ];
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
    before(() => {
      app = mm.app({ baseDir: 'apps/ssrf-check-address' });
      return app.ready();
    });

    after(() => app.close());

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
    before(() => {
      app = mm.app({ baseDir: 'apps/ssrf-check-address-useHttpClientNext' });
      return app.ready();
    });

    after(() => app.close());

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
    before(() => {
      app = mm.app({ baseDir: 'apps/ssrf-ip-exception-list' });
      return app.ready();
    });

    after(() => app.close());

    it('should safeCurl work', async () => {
      const ctx = app.createAnonymousContext();
      const url = process.env.CI ? 'https://registry.npmjs.org' : 'https://registry.npmmirror.com';

      const r1 = await app.safeCurl<Record<string, string>>(url, { dataType: 'json' });
      const r2 = await app.agent.safeCurl(url, { dataType: 'json' });
      const r3 = await ctx.safeCurl(url, { dataType: 'json' });
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r3.status, 200);
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
      assert.equal(r1.data, 'response');
      assert(r2.data === 'response');
      assert(r3.data === 'response');
      assert(count === 3);
    });
  });

  describe('hostnameExceptionList', () => {
    before(() => {
      app = mm.app({ baseDir: 'apps/ssrf-hostname-exception-list' });
      return app.ready();
    });

    after(() => app.close());

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
});

async function checkIllegalAddressError(instance: any, url: string) {
  try {
    await instance.safeCurl(url);
    throw new Error('should not execute');
  } catch (err: any) {
    assert.equal(err.name, 'IllegalAddressError');
    assert.match(err.message, /illegal address/);
  }
}
