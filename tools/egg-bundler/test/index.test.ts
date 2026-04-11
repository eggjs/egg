import { describe, it, expect } from 'vitest';

import { bundle } from '../src/index.ts';

describe('@eggjs/egg-bundler', () => {
  it('bundle() is a placeholder that throws until implemented', async () => {
    await expect(bundle({ projectPath: '/tmp', outputPath: '/tmp/out' })).rejects.toThrow(/not implemented/);
  });
});
