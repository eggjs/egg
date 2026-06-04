import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))(
  'test/cluster.test.ts > skipped scenarios',
  () => {
    afterEach(mm.restore);

    describe.skip('cluster with fullpath baseDir', () => {
      let app: MockApplication;
      beforeAll(async () => {
        app = mm.cluster({
          baseDir: getFixtures('demo'),
          // cache: false,
          // coverage: false,
        });
        await app.ready();
      });
      afterAll(() => app.close());

      it('should work', async () => {
        await app.httpRequest().get('/hello').expect('hi').expect(200);
      });
    });

    describe.skip('cluster with shortpath baseDir', () => {
      let app: MockApplication;
      beforeAll(async () => {
        app = mm.cluster({
          baseDir: getFixtures('demo'),
          // cache: false,
          // coverage: false,
        });
        await app.ready();
      });
      afterAll(() => app.close());

      it('should work', async () => {
        await app.httpRequest().get('/hello').expect('hi').expect(200);
      });
    });

    describe.skip('cluster with customEgg=string', () => {
      let app: MockApplication;
      beforeAll(async () => {
        app = mm.cluster({
          baseDir: getFixtures('apps/barapp'),
          customEgg: getFixtures('bar'),
          // cache: false,
          // coverage: false,
        });
        await app.ready();
      });
      afterAll(() => app.close());

      it('should work', async () => {
        await app
          .httpRequest()
          .get('/')
          .expect({
            foo: 'bar',
            foobar: 'bar',
          })
          .expect(200);
      });
    });

    describe.skip('cluster with framework=string', () => {
      let app: MockApplication;
      beforeAll(async () => {
        app = mm.cluster({
          baseDir: getFixtures('apps/barapp'),
          framework: getFixtures('bar'),
          // cache: false,
          // coverage: false,
        });
        await app.ready();
      });
      afterAll(() => app.close());

      it('should work', async () => {
        await app
          .httpRequest()
          .get('/')
          .expect({
            foo: 'bar',
            foobar: 'bar',
          })
          .expect(200);
      });
    });

    describe.skip('cluster with customEgg=true', () => {
      let app: MockApplication;
      beforeAll(async () => {
        mm(process, 'cwd', () => {
          return getFixtures('bar');
        });
        app = mm.cluster({
          baseDir: getFixtures('apps/barapp'),
          customEgg: true,
          // cache: false,
          // coverage: false,
        });
        await app.ready();
      });
      afterAll(() => app.close());

      it('should work', async () => {
        await app
          .httpRequest()
          .get('/')
          .expect({
            foo: 'bar',
            foobar: 'bar',
          })
          .expect(200);
      });
    });

    describe.skip('cluster with framework=true', () => {
      let app: MockApplication;
      beforeAll(async () => {
        mm(process, 'cwd', () => {
          return getFixtures('bar');
        });
        app = mm.cluster({
          baseDir: getFixtures('apps/barapp'),
          framework: true,
          // cache: false,
          // coverage: false,
        });
        await app.ready();
      });
      afterAll(() => app.close());

      it('should work', async () => {
        await app
          .httpRequest()
          .get('/')
          .expect({
            foo: 'bar',
            foobar: 'bar',
          })
          .expect(200);
      });
    });

    describe.skip('cluster with opts.customEgg', () => {
      let app: MockApplication;
      afterAll(() => app.close());

      it('should pass execArgv', async () => {
        app = mm.cluster({
          baseDir: getFixtures('custom_egg'),
          customEgg: getFixtures('bar'),
          workers: 1,
          // cache: false,
          // coverage: false,
          opt: {
            execArgv: ['--inspect'],
          },
        });
        // app.debug();
        await app
          .expect('stdout', /app_worker#1:/)
          .expect('stderr', /Debugger listening/)
          .end();
      });
    });

    describe.skip('prerequire', () => {
      let app: MockApplication;
      afterAll(() => app.close());

      it('should load files', async () => {
        mm(process.env, 'EGG_BIN_PREREQUIRE', 'true');
        mm(process.env, 'NODE_DEBUG', 'egg-mock:prerequire');
        app = mm.cluster({
          baseDir: getFixtures('yadan_app'),
          workers: 1,
          // cache: false,
          // coverage: false,
        });
        await app
          .expect('stderr', /prerequire .+?\/app\/extend\/application.js/)
          .expect('code', 0)
          .end();
      });
    });
  },
);
