import assert from 'node:assert/strict';

import { ControllerType } from '@eggjs/tegg-types';
import { describe, it } from '@voidzero-dev/vite-plus/test';

import { ControllerMetaBuilderFactory, HTTPControllerMeta } from '../src/index.js';
import { AclController } from './fixtures/AclController.js';

describe('test/Acl.test.ts', () => {
  it('should work', () => {
    const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(AclController, ControllerType.HTTP)!;
    const aclControllerMeta = builder.build()! as HTTPControllerMeta;
    const fooMethod = aclControllerMeta.methods.find((t) => t.name === 'foo')!;
    const barMethod = aclControllerMeta.methods.find((t) => t.name === 'bar')!;
    const fooAcl = aclControllerMeta.getMethodAcl(fooMethod);
    const barAcl = aclControllerMeta.getMethodAcl(barMethod);
    assert.equal(fooAcl, 'mock2');
    assert.equal(barAcl, 'mock1');
  });
});
