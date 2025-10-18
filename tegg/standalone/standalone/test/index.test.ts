import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { mm } from 'mm';
import { type ModuleConfig, ModuleConfigs, ModuleDescriptorDumper } from '@eggjs/tegg/helper';
import { importResolve } from '@eggjs/utils';

import { main, StandaloneContext, Runner, preLoad } from '../src/index.ts';
import { crosscutAdviceParams, pointcutAdviceParams } from './fixtures/aop-module/Hello.ts';
import { Foo } from './fixtures/dal-module/src/Foo.ts';

const __dirname = import.meta.dirname;

describe('standalone/standalone/test/index.test.ts', () => {
  describe('simple runner', () => {
    const fixture = path.join(__dirname, './fixtures/simple');

    beforeEach(() => {
      mm.restore();
      mm.spy(ModuleDescriptorDumper, 'dump');
    });

    it('should work', async () => {
      const msg: string = await main(fixture);
      assert.equal(msg, 'hello!hello from ctx');
      await sleep(500);
      assert.equal((ModuleDescriptorDumper.dump as any).called, 1);
    });

    it('should not dump', async () => {
      await main(fixture, { dump: false });
      await sleep(500);
      assert.equal((ModuleDescriptorDumper.dump as any).called, undefined);
    });
  });

  describe('runner with dependency', () => {
    it('should work', async () => {
      const msg: string = await main(path.join(__dirname, './fixtures/dependency'), {
        dependencies: [path.join(__dirname, './fixtures/dependency/node_modules/dependency-1')],
      });
      assert.equal(msg, 'hello!{"features":{"dynamic":{"foo":"bar"}}}');
    });
  });

  describe('runner with inner object', () => {
    it('should work', async () => {
      const msg: string = await main(path.join(__dirname, './fixtures/inner-object'), {
        innerObjectHandlers: {
          hello: [
            {
              obj: {
                hello() {
                  return 'hello, inner';
                },
              },
            },
          ],
        },
      });
      assert.equal(msg, 'hello, inner');
    });
  });

  describe('runner with custom context', () => {
    it('should work', async () => {
      const runner = new Runner(path.join(__dirname, './fixtures/custom-context'));
      await runner.init();
      const ctx = new StandaloneContext();
      ctx.set('foo', 'foo');
      const msg = await runner.run(ctx);
      await runner.destroy();
      assert(msg === 'foo');
    });
  });

  describe('module with config', () => {
    it('should work', async () => {
      const config = await main(path.join(__dirname, './fixtures/module-with-config'));
      assert.deepEqual(config, {
        features: {
          dynamic: {
            foo: 'bar',
          },
        },
      });
    });

    it('should work with env', async () => {
      const config = await main(path.join(__dirname, './fixtures/module-with-env-config'), {
        env: 'dev',
      });
      assert.deepEqual(config, {
        features: {
          dynamic: {
            foo: 'foo',
          },
        },
      });
    });

    it('should empty config work', async () => {
      const config = await main(path.join(__dirname, './fixtures/module-with-empty-config'));
      assert.deepEqual(config, {});
    });

    it('should empty default config work', async () => {
      const config = await main(path.join(__dirname, './fixtures/module-with-empty-default-config'), { env: 'dev' });
      assert.deepEqual(config, {
        features: {
          dynamic: {
            foo: 'foo',
          },
        },
      });
    });
  });

  describe('@ConfigSource qualifier', () => {
    it('should work', async () => {
      const { configs, foo, bar } = (await main(path.join(__dirname, './fixtures/multi-modules'))) as {
        configs: ModuleConfigs;
        foo: ModuleConfig;
        bar: ModuleConfig;
      };
      assert.deepEqual(configs.get('foo'), foo);
      assert.deepEqual(configs.get('bar'), bar);
    });
  });

  describe('runner with runtimeConfig', () => {
    it('should work', async () => {
      const msg = await main(path.join(__dirname, './fixtures/runtime-config'));
      assert.deepEqual(msg, {
        baseDir: path.join(__dirname, './fixtures/runtime-config'),
        env: undefined,
        name: undefined,
      });
    });

    it('should auto set name and env', async () => {
      const msg = await main(path.join(__dirname, './fixtures/runtime-config'), {
        name: 'foo',
        env: 'unittest',
      });
      assert.deepEqual(msg, {
        baseDir: path.join(__dirname, './fixtures/runtime-config'),
        name: 'foo',
        env: 'unittest',
      });
    });
  });

  describe('multi instance prototype runner', () => {
    const fixturePath = path.join(__dirname, './fixtures/multi-callback-instance-module');
    afterEach(async () => {
      await fs.unlink(path.join(fixturePath, 'main', 'foo.log'));
      await fs.unlink(path.join(fixturePath, 'main', 'bar.log'));
      await fs.unlink(path.join(fixturePath, 'biz', 'fooBiz.log'));
      await fs.unlink(path.join(fixturePath, 'biz', 'barBiz.log'));
    });

    it('should work', async () => {
      await main(fixturePath);
      const fooContent = await fs.readFile(path.join(fixturePath, 'main', 'foo.log'), 'utf8');
      const barContent = await fs.readFile(path.join(fixturePath, 'main', 'bar.log'), 'utf8');
      assert(fooContent.includes('hello, foo'));
      assert(barContent.includes('hello, bar'));

      const fooBizContent = await fs.readFile(path.join(fixturePath, 'biz', 'fooBiz.log'), 'utf8');
      const barBizContent = await fs.readFile(path.join(fixturePath, 'biz', 'barBiz.log'), 'utf8');
      assert(fooBizContent.includes('hello, foo biz'));
      assert(barBizContent.includes('hello, bar biz'));
    });
  });

  // EggPrototypeNotFound: [tegg/standalone] bootstrap tegg failed: Object eggObjectFactory not found in LOAD_UNIT:dynamicInjectModule
  describe.skip('dynamic inject', () => {
    const fixturePath = path.join(__dirname, './fixtures/dynamic-inject-module');

    it('should work', async () => {
      const msgs = await main(fixturePath, {
        dependencies: [{ baseDir: path.join(__dirname, '..'), extraFilePattern: ['!**/test'] }],
      });
      assert.deepEqual(msgs, [
        'hello, foo(context:0)',
        'hello, bar(context:0)',
        'hello, foo(singleton:0)',
        'hello, bar(singleton:0)',
      ]);
    });
  });

  describe('inject', () => {
    it('should optional work', async () => {
      const fixturePath = path.join(__dirname, './fixtures/optional-inject');
      const nil = await main<boolean>(fixturePath);
      assert.equal(nil, true);
    });

    it('should throw error if no proto found', async () => {
      const fixturePath = path.join(__dirname, './fixtures/invalid-inject');
      const runner = new Runner(fixturePath);
      await assert.rejects(
        runner.init(),
        /EggPrototypeNotFound: Object doesNotExist not found in LOAD_UNIT:invalidInject/
      );
      await runner.destroy();
    });
  });

  describe('aop runtime', () => {
    const fixturePath = path.join(__dirname, './fixtures/aop-module');

    it('should work', async () => {
      const msg = await main(fixturePath);
      assert.deepEqual(
        msg,
        `withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(aop))${JSON.stringify(pointcutAdviceParams)})${JSON.stringify(crosscutAdviceParams)})`
      );
    });
  });

  describe('load', () => {
    let runner: Runner;
    afterEach(async () => {
      if (runner) await runner.destroy();
    });

    it('should work', async () => {
      runner = new Runner(path.join(__dirname, './fixtures/simple'));
      await runner.init();
      const loadunits = await runner.load();
      for (const loadunit of loadunits) {
        for (const proto of loadunit.iterateEggPrototype()) {
          if (proto.id.match(/:hello$/)) {
            assert.equal(proto.className, 'Hello');
          } else if (proto.id.match(/:moduleConfigs$/)) {
            assert.equal(proto.className, undefined);
          } else if (proto.id.match(/:moduleConfig$/)) {
            assert.equal(proto.className, undefined);
          }
        }
      }
    });

    it('should work with multi', async () => {
      runner = new Runner(path.join(__dirname, './fixtures/multi-callback-instance-module'));
      await runner.init();
      const loadunits = await runner.load();
      for (const loadunit of loadunits) {
        for (const proto of loadunit.iterateEggPrototype()) {
          if (proto.id.match(/:dynamicLogger$/)) {
            assert.equal(proto.className, 'DynamicLogger');
          }
        }
      }
    });
  });

  describe('dal runner', () => {
    it('should work', async () => {
      const foo: Foo = await main(path.join(__dirname, './fixtures/dal-module'), {
        env: 'unittest',
      });
      assert(foo);
      assert.equal(foo.col1, '2333');
    });
  });

  describe('dal transaction runner', () => {
    it('should work', async () => {
      const foo: Array<Array<Foo>> = await main(path.join(__dirname, './fixtures/dal-transaction-module'), {
        env: 'unittest',
      });
      // insert_succeed_transaction_1
      assert.equal(foo[0].length, 1);
      // insert_succeed_transaction_2
      assert.equal(foo[1].length, 1);
      // insert_failed_transaction_1
      assert.equal(foo[2].length, 0);
      // insert_failed_transaction_2
      assert.equal(foo[3].length, 0);
    });
  });

  describe('ajv runner', () => {
    it('should throw AjvInvalidParamError', async () => {
      await assert.rejects(
        async () => {
          await main<string>(path.join(__dirname, './fixtures/ajv-module'), {
            dependencies: [path.dirname(importResolve('@eggjs/tegg-ajv-plugin/package.json'))],
          });
        },
        (err: any) => {
          assert.equal(err.name, 'AjvInvalidParamError');
          assert.equal(err.message, 'Validation Failed');
          assert.deepEqual(err.errorData, {});
          assert.equal(
            err.currentSchema,
            '{"type":"object","properties":{"fullname":{"transform":["trim"],"maxLength":100,"type":"string"},"skipDependencies":{"type":"boolean"},"registryName":{"type":"string"}},"required":["fullname","skipDependencies"]}'
          );
          assert.deepEqual(err.errors, [
            {
              instancePath: '',
              schemaPath: '#/required',
              keyword: 'required',
              params: {
                missingProperty: 'fullname',
              },
              message: "must have required property 'fullname'",
            },
          ]);
          return true;
        }
      );
    });

    it('should pass', async () => {
      const result = await main<string>(path.join(__dirname, './fixtures/ajv-module-pass'), {
        dependencies: [path.dirname(importResolve('@eggjs/tegg-ajv-plugin/package.json'))],
      });
      assert.equal(result, '{"body":{"fullname":"mock fullname","skipDependencies":true,"registryName":"ok"}}');
    });
  });

  describe('lifecycle', () => {
    const fixturePath = path.join(__dirname, './fixtures/lifecycle');
    let Foo: any;

    beforeEach(async () => {
      mm.restore();
      mm.spy(ModuleDescriptorDumper, 'dump');
      let fooPath = path.join(fixturePath, 'foo.ts');
      if (process.platform === 'win32') {
        fooPath = pathToFileURL(fooPath).toString();
      }
      Foo = await import(fooPath).then(m => m.Foo);
    });

    it('should work', async () => {
      await preLoad(fixturePath);
      await main(fixturePath);
      assert.deepEqual(Foo.staticCalled, ['preLoad', 'construct', 'postConstruct', 'preInject', 'postInject', 'init']);
      assert.equal((ModuleDescriptorDumper.dump as any).called, 1);
    });
  });
});
