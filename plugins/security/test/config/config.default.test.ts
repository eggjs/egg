import { describe, it, expect } from '@voidzero-dev/vite-plus/test';

import config from '../../src/config/config.default.ts';

describe('test/config/config.default.test.ts', () => {
  it('should config default values keep stable', () => {
    expect(config).toMatchSnapshot();
  });
});
