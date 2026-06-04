import { defineProject, type UserWorkspaceConfig } from 'vitest/config';

const config: UserWorkspaceConfig = defineProject({
  test: {
    // ControllerMetaManager.test.ts intentionally triggers "duplicate proto"
    // errors that pollute the process-global tegg controller registry. With the
    // monorepo-wide isolate:false, that pollution leaks into sibling test files
    // sharing the worker (e.g. http/params.test.ts), failing them depending on
    // file order. Isolate this project per-file so each test file gets a clean
    // module registry.
    isolate: true,
    hookTimeout: 30000,
  },
});

export default config;
