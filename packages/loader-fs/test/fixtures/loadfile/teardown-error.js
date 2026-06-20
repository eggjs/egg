'use strict';

// Simulates a module whose import loses the race with a vitest test-environment
// teardown: the runtime raises an `EnvironmentTeardownError`. `RealLoaderFS.loadFile`
// should treat this as a benign no-op and resolve `undefined` instead of throwing.
const err = new Error(
  "Cannot load 'teardown-error.js' imported from import.ts after the environment was torn down. This is not a bug in Vitest.",
);
err.name = 'EnvironmentTeardownError';
throw err;
