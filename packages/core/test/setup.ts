import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Make Mocha-style hooks available globally for compatibility
global.before = beforeAll;
global.after = afterAll;
global.beforeEach = beforeEach;
global.afterEach = afterEach;

// Extend global types
declare global {
  var before: typeof beforeAll;
  var after: typeof afterAll;
  var beforeEach: typeof beforeEach;
  var afterEach: typeof afterEach;
}