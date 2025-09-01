import path from 'node:path';
import { execSync } from 'node:child_process';
import { __dirname } from './helper.js';

describe.skip('test/tsd.test.ts', () => {
  it('should tsd run success', () => {
    // will hang up, so skip it
    execSync('tsd', {
      cwd: path.join(__dirname, '..'),
    });
  });
});
