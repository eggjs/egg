import { describe, it, expect } from 'vitest';

import * as exports from '../src/index.ts';

describe('plugin/orm/exports.test.ts', () => {
  it('should export stable', () => {
    expect(exports).toMatchSnapshot();
  });
});
