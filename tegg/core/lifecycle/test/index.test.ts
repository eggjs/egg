import { expect, it } from 'vitest';

import * as exports from '../src/index.ts';

it('should export stable', async () => {
  expect(exports).toMatchSnapshot();
});

it('should wait all lifecycle hooks before throwing', async () => {
  const util = new exports.LifecycleUtil<any, any>();
  const error = new Error('mock error');
  const calls: string[] = [];

  util.registerLifecycle({
    async postCreate() {
      calls.push('reject');
      throw error;
    },
  });
  util.registerLifecycle({
    async postCreate() {
      await new Promise((resolve) => setTimeout(resolve, 10));
      calls.push('settled');
    },
  });

  await expect(util.objectPostCreate({}, { id: 'mock' })).rejects.toBe(error);
  expect(calls).toEqual(['reject', 'settled']);
});
