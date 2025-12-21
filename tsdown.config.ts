import { defineConfig } from 'tsdown';

export default defineConfig({
  // Workspace configuration - builds all library packages from root
  workspace: {
    include: ['packages/*', 'plugins/*', 'tools/*', 'tegg/core/*', 'tegg/plugin/*', 'tegg/standalone/*'],
    exclude: [
      'packages/tsconfig', // Config-only package, no src to build
      'dist',
    ],
  },

  // Shared defaults
  // unbundle: true,
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
