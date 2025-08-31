import assert from 'node:assert/strict';

import { mm } from 'mm';
import { request } from '@eggjs/supertest';
import coffee from 'coffee';

import { utils } from '../src/index.js';
import { createApp, getFilepath, type Application } from './helper.js';

describe('test/egg-ts.test.ts', () => {
  let app: Application | undefined;

  beforeEach(() => {
    // require.extensions['.ts'] = require.extensions['.js'];
    // utils.extensions['.ts'] = require.extensions['.js'];
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    app = undefined;
    return mm.restore();
    // delete require.extensions['.ts'];
    // delete utils.extensions['.ts'];
  });

  describe('load ts file', () => {
    describe('load app', () => {
      it('should success', async () => {
        mm(process.env, 'EGG_TYPESCRIPT', 'true');
        app = createApp('egg-ts');

        (app as any).Helper = class Helper {};
        await app.loader.loadPlugin();
        await app.loader.loadConfig();
        await app.loader.loadApplicationExtend();
        await app.loader.loadAgentExtend();
        await app.loader.loadRequestExtend();
        await app.loader.loadResponseExtend();
        await app.loader.loadContextExtend();
        await app.loader.loadHelperExtend();
        await app.loader.loadCustomApp();
        await app.loader.loadService();
        await app.loader.loadController();
        await app.loader.loadRouter();
        await app.loader.loadPlugin();
        await app.loader.loadMiddleware();

        await request(app.callback())
          .get('/')
          .expect(res => {
            assert(res.text.includes('from extend context'));
            assert(res.text.includes('from extend application'));
            assert(res.text.includes('from extend request'));
            assert(res.text.includes('from extend agent'));
            assert(res.text.includes('from extend helper'));
            assert(res.text.includes('from extend response'));
            assert(res.text.includes('from custom app'));
            assert(res.text.includes('from plugins'));
            assert(res.text.includes('from config.default'));
            assert(res.text.includes('from middleware'));
            assert(res.text.includes('from service'));
          })
          .expect(200);
      });
    });

    describe('load agent', () => {
      it('should success', async () => {
        mm(process.env, 'EGG_TYPESCRIPT', 'true');
        app = createApp('egg-ts');

        (app as any).Helper = class Helper {};
        await app.loader.loadPlugin();
        await app.loader.loadConfig();
        await app.loader.loadApplicationExtend();
        await app.loader.loadAgentExtend();
        await app.loader.loadRequestExtend();
        await app.loader.loadResponseExtend();
        await app.loader.loadContextExtend();
        await app.loader.loadHelperExtend();
        await app.loader.loadCustomAgent();
        await app.loader.loadService();
        await app.loader.loadController();
        await app.loader.loadRouter();
        await app.loader.loadPlugin();
        await app.loader.loadMiddleware();

        await request(app.callback())
          .get('/')
          .expect(res => {
            // console.log(res.text);
            assert(res.text.includes('from extend context'));
            assert(res.text.includes('from extend application'));
            assert(res.text.includes('from extend request'));
            assert(res.text.includes('from extend agent'));
            assert(res.text.includes('from extend helper'));
            assert(res.text.includes('from extend response'));
            assert(res.text.includes('from custom agent'));
            assert(res.text.includes('from plugins'));
            assert(res.text.includes('from config.default'));
            assert(res.text.includes('from middleware'));
            assert(res.text.includes('from service'));
          })
          .expect(200);
      });
    });
  });

  it('should not load d.ts files while typescript was true', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    app = createApp('egg-ts-js');

    await app.loader.loadController();
    assert(!app.controller.god);
    assert(app.controller.test);
  });

  it('should support load ts,js files', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    app = createApp('egg-ts-js');

    await app.loader.loadService();
    assert(app.serviceClasses.lord);
    assert(app.serviceClasses.test);
  });

  it('should auto require tsconfig-paths', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    app = createApp('egg-ts-js-tsconfig-paths');

    await app.loader.loadService();
    assert(app.serviceClasses.lord);
    assert(app.serviceClasses.test);
  });

  it.skip('should not load ts files while EGG_TYPESCRIPT was not exist', async () => {
    app = createApp('egg-ts-js');

    await app.loader.loadApplicationExtend();
    await app.loader.loadService();
    assert.equal((app as any).appExtend, undefined);
    assert(app.serviceClasses.lord);
    assert(!app.serviceClasses.test);
  });

  it.skip('should not load ts files while EGG_TYPESCRIPT was true but no extensions', async () => {
    mm(process.env, 'EGG_TYPESCRIPT', 'true');
    mm(utils, 'extensions', ['.js', '.json']);
    app = createApp('egg-ts-js');
    await app.loader.loadService();
    assert(app.serviceClasses.lord);
    assert(!app.serviceClasses.test);
  });

  it.skip('should compile app-ts without error', async () => {
    await coffee
      .spawn(
        'node',
        [
          '--require',
          'ts-node/register/type-check',
          getFilepath('app-ts/app.ts'),
        ],
        {
          env: {
            ...process.env,
            TS_NODE_PROJECT: getFilepath('app-ts/tsconfig.json'),
          },
        }
      )
      .debug()
      .expect('code', 0)
      .end();
  });

  it.skip('should compile error with app-ts/error', async () => {
    await coffee
      .spawn(
        'node',
        [
          '--require',
          'ts-node/register/type-check',
          getFilepath('app-ts/app-error.ts'),
        ],
        {
          env: {
            ...process.env,
            TS_NODE_PROJECT: getFilepath('app-ts/tsconfig.json'),
          },
        }
      )
      .debug()
      .expect(
        'stderr',
        /Property 'abb' does not exist on type 'EggCore<{ env: string; }>'/
      )
      .expect(
        'stderr',
        /Property 'abc' does not exist on type 'typeof BaseContextClass'/
      )
      .expect('stderr', /'loadPlugin' is protected/)
      .expect('stderr', /'loadConfig' is protected/)
      .expect('stderr', /'loadApplicationExtend' is protected/)
      .expect('stderr', /'loadAgentExtend' is protected/)
      .expect('stderr', /'loadRequestExtend' is protected/)
      .expect('stderr', /'loadResponseExtend' is protected/)
      .expect('stderr', /'loadContextExtend' is protected/)
      .expect('stderr', /'loadHelperExtend' is protected/)
      .expect('stderr', /'loadCustomAgent' is protected/)
      .expect('stderr', /'loadService' is protected/)
      .expect('stderr', /'loadController' is protected/)
      .expect(
        'stderr',
        /Property 'checkEnvType' does not exist on type 'string'/
      )
      .expect('stderr', /'ctx' is protected/)
      .expect('code', 1)
      .end();
  });
});
