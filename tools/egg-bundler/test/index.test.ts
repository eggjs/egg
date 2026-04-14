import { describe, expect, it } from 'vitest';

import { bundle } from '../src/index.ts';

describe('@eggjs/egg-bundler', () => {
  it('bundle() is a placeholder that throws until implemented', async () => {
    await expect(bundle({ baseDir: '/tmp', outputDir: '/tmp/out' })).rejects.toThrow(/not implemented/);
  });
});
