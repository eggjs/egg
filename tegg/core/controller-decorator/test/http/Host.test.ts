import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { ControllerInfoUtil, MethodInfoUtil } from '../../src/util/index.js';
import { HostController } from '../fixtures/HostController.js';

describe('test/Host.test.ts', () => {
  it('controller Host work', () => {
    const controllerHost = ControllerInfoUtil.getControllerHosts(HostController);
    assert.equal(controllerHost![0], 'foo.eggjs.com');
  });

  it('method Host work', () => {
    const methodHost = MethodInfoUtil.getMethodHosts(HostController, 'bar');
    assert.equal(methodHost![0], 'bar.eggjs.com');
  });
});
