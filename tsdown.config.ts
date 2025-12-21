import { defineConfig } from 'tsdown';

export default defineConfig({
  // Workspace configuration - builds all library packages from root
  workspace: {
    // include: ['packages/*', 'plugins/*', 'tools/*', 'tegg/core/*', 'tegg/plugin/*', 'tegg/standalone/*'],
    // FIXME: auto mode is not working, rolldown was hang and cpu 400% when using auto mode
    include: 'auto',
    // exclude: [
    //   'packages/tsconfig', // Config-only package, no src to build
    // ],
  },

  // Shared defaults
  unbundle: true,
  unused: {
    level: 'error',
  },
  exports: {
    devExports: true,
  },
  fixedExtension: false,
  publint: {
    level: 'suggestion',
    strict: true,
  },

  // Default entry pattern - glob to include all source files
  entry: 'src/**/*.ts',
  // external: [/^@eggjs\//, 'egg'],
});
