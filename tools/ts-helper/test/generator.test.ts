import assert from 'node:assert';
import { generator } from '..';
const { generators, registerGenerator, BaseGenerator } = generator;

describe('generator.test.ts', () => {
  it('should has generators without error', async () => {
    assert(generators.auto);
    assert(generators.auto.defaultConfig);
    assert(generators.class);
    assert(generators.class.defaultConfig);
    assert(generators.config);
    assert(generators.config.defaultConfig);
    assert(generators.custom);
    assert(generators.custom.defaultConfig);
    assert(generators.egg);
    assert(generators.extend);
    assert(generators.extend.defaultConfig);
    assert(generators.function);
    assert(generators.function.defaultConfig);
    assert(generators.object);
    assert(generators.object.defaultConfig);
    assert(generators.plugin);
    assert(generators.plugin.defaultConfig);
  });

  it('should registerGenerator without error', async () => {
    class MySelfDefinedGenerator extends BaseGenerator<any> {
      buildParams() {
        return {};
      }

      renderWithParams(params: any) {
        console.info(params);
        return { dist: '123' };
      }
    }

    registerGenerator('myselfdefinedGenerator', MySelfDefinedGenerator);
    assert('myselfdefinedGenerator' in generators);
  });
});
