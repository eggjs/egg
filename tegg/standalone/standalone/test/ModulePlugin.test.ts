import assert from 'node:assert/strict';
import path from 'node:path';

import { EggPrototypeNotFound } from '@eggjs/metadata';
import { describe, it } from 'vitest';

import { main } from '../src/index.ts';

describe('standalone/standalone/test/ModulePlugin.test.ts', () => {
  const getFixture = (name: string) => path.join(__dirname, 'fixtures', name);

  describe('EggLifecycleProto', () => {
    it('should LoadUnitLifecycleProto work', async () => {
      // The hook injects an inner object and registers a dynamic proto on the
      // business load unit at preCreate — proves lifecycle protos are live
      // (with DI wired) before business load units are created.
      const msg = await main<string>(getFixture('load-unit-lifecycle-proto'));
      assert.equal(msg, 'dynamic bar name|foo fake name');
    });

    it('should LoadUnitInstanceLifecycleProto work', async () => {
      const count = await main<number>(getFixture('load-unit-instance-lifecycle-proto'));
      assert.equal(count, 66);
    });

    it('should EggObjectLifecycleProto work', async () => {
      const msg = await main<string>(getFixture('egg-object-lifecycle-proto'));
      assert.equal(msg, 'foo message from FooEggObjectHook');
    });

    it('should EggPrototypeLifecycleProto work', async () => {
      const msg = await main<string>(getFixture('egg-prototype-lifecycle-proto'));
      assert.equal(msg, 'class name is Foo');
    });

    it('should EggContextLifecycleProto work', async () => {
      const msg = await main<string>(getFixture('egg-context-lifecycle-proto'));
      assert.equal(msg, 'Y');
    });
  });

  describe('InnerObjectProto', () => {
    it('should inject innerObject work when accessLevel is public', async () => {
      const message = await main<string>(getFixture('inner-object-proto'));
      assert.equal(message, 'with inner bar and inner foo');
    });

    it('should throw error if business proto injects a private innerObject', async () => {
      await assert.rejects(
        main<boolean>(getFixture('invalid-inner-object-inject')),
        (e: unknown) => e instanceof EggPrototypeNotFound && /innerBar not found/.test((e as Error).message),
      );
    });
  });
});
