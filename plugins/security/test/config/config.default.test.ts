import snapshot from 'snap-shot-it';
import config from '../../src/config/config.default.js';

describe('test/config/config.default.test.ts', () => {
  it('should config default values keep stable', () => {
    snapshot(config);
  });
});
