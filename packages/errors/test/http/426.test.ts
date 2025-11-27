import { strict as assert } from 'assert';

import { describe, it } from 'vitest';

import { UpgradeRequiredError, E426 } from '../../src/index.ts';

describe('test/http/426.test.ts', () => {
  it('should instantiate', () => {
    const err = new UpgradeRequiredError();
    assert(err.code === 'UPGRADE_REQUIRED');
    assert(err.message === 'Upgrade Required');
    assert(err.name === 'UpgradeRequiredError');
    assert(err.status === 426);
  });

  it('should alias to short name E426', () => {
    const err = new E426();
    assert(err.code === 'UPGRADE_REQUIRED');
    assert(err.message === 'Upgrade Required');
    assert(err.name === 'UpgradeRequiredError');
    assert(err.status === 426);
  });
});
