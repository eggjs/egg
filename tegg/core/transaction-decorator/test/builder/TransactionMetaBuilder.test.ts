import { it, assert } from 'vitest';
import { PropagationType } from '@eggjs/tegg-types';

import { TransactionMetadataUtil, TransactionMetaBuilder, Transactional } from '../../src/index.ts';
import { Foo, Bar, FooBar, BarFoo } from '../fixtures/transaction.ts';

it('should build meta data success', () => {
  assert.ok(TransactionMetadataUtil.isTransactionClazz(Foo));

  const fooBuilder = new TransactionMetaBuilder(Foo);
  assert.deepStrictEqual(fooBuilder.build(), [
    {
      propagation: PropagationType.REQUIRED,
      method: 'defaultPropagation',
      datasourceName: undefined,
    },
    {
      propagation: PropagationType.REQUIRED,
      method: 'requiredPropagation',
      datasourceName: 'testDatasourceName1',
    },
    {
      propagation: PropagationType.ALWAYS_NEW,
      method: 'alwaysNewPropagation',
      datasourceName: undefined,
    },
  ]);

  assert.ok(TransactionMetadataUtil.isTransactionClazz(Bar));
  const barBuilder = new TransactionMetaBuilder(Bar);
  assert.deepStrictEqual(barBuilder.build(), [
    {
      propagation: PropagationType.REQUIRED,
      method: 'foo',
      datasourceName: 'datasourceName2',
    },
    {
      propagation: PropagationType.ALWAYS_NEW,
      method: 'bar',
      datasourceName: undefined,
    },
  ]);

  assert.ok(TransactionMetadataUtil.isTransactionClazz(FooBar));
  const fooBarBuilder = new TransactionMetaBuilder(FooBar);
  assert.deepStrictEqual(fooBarBuilder.build(), [
    {
      propagation: PropagationType.ALWAYS_NEW,
      method: 'foo',
      datasourceName: undefined,
    },
  ]);

  const barFooBuilder = new TransactionMetaBuilder(BarFoo);
  assert.ok(!TransactionMetadataUtil.isTransactionClazz(BarFoo));
  assert.deepStrictEqual(barFooBuilder.build(), []);

  assert.throws(() => {
    Transactional({ propagation: 'xx' as PropagationType });
  }, /unknown propagation type xx/);
});
