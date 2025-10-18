import assert from 'node:assert';
import { describe, it } from 'vitest';
import { PrototypeUtil } from '@eggjs/core-decorator';

import { CrosscutAdviceFactory, AspectMetaBuilder } from '../src/index.ts';
import {
  CrosscutClassAdviceExample,
  CrosscutCustomAdviceExample,
  CrosscutExample,
  CrosscutNameAdviceExample,
} from './fixtures/CrosscutExample.ts';
import {
  GetterExample,
  PointcutAdviceAfterReturnExample,
  PointcutAdviceBeforeCallExample,
  PointcutExample,
} from './fixtures/PointcutExample.ts';
import {
  ChildExample,
  CrosscutNoOverwriteParentExample,
  CrosscutOverwriteChildExample,
  CrosscutOverwriteParentExample,
  ParentExample,
  PointcutAdviceNoOverwriteParentExample,
  PointcutAdviceOverwriteChildExample,
  PointcutAdviceOverwriteParentExample,
} from './fixtures/InheritExample.ts';

describe('test/AspectMetaBuild.test.ts', () => {
  const crosscutAdviceFactory = new CrosscutAdviceFactory();
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutClassAdviceExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutNameAdviceExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutCustomAdviceExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutOverwriteParentExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutOverwriteChildExample);
  crosscutAdviceFactory.registerCrossAdviceClazz(CrosscutNoOverwriteParentExample);

  describe('Pointcut', () => {
    it('should work', () => {
      const builder = new AspectMetaBuilder(PointcutExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 1);
      const aspect = aspects[0];
      assert(aspect.clazz === PointcutExample);
      assert(aspect.method === 'hello');
      const advices = aspect.adviceList;

      assert.deepStrictEqual(advices, [
        {
          name: 'PointcutExample#hello#PointcutAdviceBeforeCallExample#0',
          clazz: PointcutAdviceBeforeCallExample,
          adviceParams: undefined,
        },
        {
          name: 'PointcutExample#hello#PointcutAdviceAfterReturnExample#1',
          clazz: PointcutAdviceAfterReturnExample,
          adviceParams: undefined,
        },
      ]);
    });
  });

  describe('Crosscut', () => {
    it('should work', () => {
      const builder = new AspectMetaBuilder(CrosscutExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 1);
      const aspect = aspects[0];
      assert(aspect.clazz === CrosscutExample);
      assert(aspect.method === 'hello');
      const advices = aspect.adviceList;
      assert.deepStrictEqual(advices, [
        {
          name: 'CrosscutExample#hello#CrosscutClassAdviceExample#0',
          clazz: CrosscutClassAdviceExample,
          adviceParams: undefined,
        },
        {
          name: 'CrosscutExample#hello#CrosscutNameAdviceExample#1',
          clazz: CrosscutNameAdviceExample,
          adviceParams: undefined,
        },
        {
          name: 'CrosscutExample#hello#CrosscutCustomAdviceExample#2',
          clazz: CrosscutCustomAdviceExample,
          adviceParams: undefined,
        },
      ]);
    });
  });

  describe('inherit', () => {
    it('child should work', () => {
      const builder = new AspectMetaBuilder(ChildExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 2);
      const overwriteAspect = aspects.find(t => t.method === 'overwriteMethod');
      assert(overwriteAspect);
      assert(overwriteAspect.clazz === ChildExample);
      const overwriteAdvices = overwriteAspect.adviceList;

      assert.deepStrictEqual(overwriteAdvices, [
        {
          name: 'ChildExample#overwriteMethod#CrosscutOverwriteParentExample#0',
          clazz: CrosscutOverwriteParentExample,
          adviceParams: undefined,
        },
        {
          name: 'ChildExample#overwriteMethod#CrosscutOverwriteChildExample#1',
          clazz: CrosscutOverwriteChildExample,
          adviceParams: undefined,
        },
        // FIXME: parent/child should has correct order
        {
          name: 'ChildExample#overwriteMethod#PointcutAdviceOverwriteChildExample#2',
          clazz: PointcutAdviceOverwriteChildExample,
          adviceParams: undefined,
        },
        {
          name: 'ChildExample#overwriteMethod#PointcutAdviceOverwriteParentExample#3',
          clazz: PointcutAdviceOverwriteParentExample,
          adviceParams: undefined,
        },
      ]);

      const noOverwriteAspect = aspects.find(t => t.method === 'noOverwriteMethod');
      assert(noOverwriteAspect);
      assert(noOverwriteAspect.clazz === ChildExample);
      const noOverwriteAdvices = noOverwriteAspect.adviceList;
      assert.deepStrictEqual(noOverwriteAdvices, [
        {
          name: 'ChildExample#noOverwriteMethod#CrosscutNoOverwriteParentExample#0',
          clazz: CrosscutNoOverwriteParentExample,
          adviceParams: undefined,
        },
        {
          name: 'ChildExample#noOverwriteMethod#PointcutAdviceNoOverwriteParentExample#1',
          clazz: PointcutAdviceNoOverwriteParentExample,
          adviceParams: undefined,
        },
      ]);
    });

    it('parent should work', () => {
      const builder = new AspectMetaBuilder(ParentExample, {
        crosscutAdviceFactory,
      });
      const aspects = builder.build();
      assert(aspects.length === 2);

      const overwriteAspect = aspects.find(t => t.method === 'overwriteMethod');
      assert(overwriteAspect);
      assert(overwriteAspect.clazz === ParentExample);
      const overwriteAdvices = overwriteAspect.adviceList;
      assert.deepStrictEqual(overwriteAdvices, [
        {
          name: 'ParentExample#overwriteMethod#CrosscutOverwriteParentExample#0',
          clazz: CrosscutOverwriteParentExample,
          adviceParams: undefined,
        },
        {
          name: 'ParentExample#overwriteMethod#PointcutAdviceOverwriteParentExample#1',
          clazz: PointcutAdviceOverwriteParentExample,
          adviceParams: undefined,
        },
      ]);

      const noOverwriteAspect = aspects.find(t => t.method === 'noOverwriteMethod');
      assert(noOverwriteAspect);
      assert(noOverwriteAspect.clazz === ParentExample);
      const noOverwriteAdvices = noOverwriteAspect.adviceList;
      assert.deepStrictEqual(noOverwriteAdvices, [
        {
          name: 'ParentExample#noOverwriteMethod#CrosscutNoOverwriteParentExample#0',
          clazz: CrosscutNoOverwriteParentExample,
          adviceParams: undefined,
        },
        {
          name: 'ParentExample#noOverwriteMethod#PointcutAdviceNoOverwriteParentExample#1',
          clazz: PointcutAdviceNoOverwriteParentExample,
          adviceParams: undefined,
        },
      ]);
    });
  });

  it('should not access getter', () => {
    const builder = new AspectMetaBuilder(GetterExample, {
      crosscutAdviceFactory,
    });
    const aspects = builder.build();
    assert.equal(aspects.length, 1);
  });

  it('should has right file path', () => {
    const filePath = PrototypeUtil.getFilePath(CrosscutClassAdviceExample);
    let expectedFilePath = require.resolve('./fixtures/CrosscutExample.ts');
    if (process.platform === 'win32') {
      expectedFilePath = expectedFilePath.replaceAll('\\', '/');
    }
    assert.equal(filePath, expectedFilePath);
  });
});
