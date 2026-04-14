import { defineConfig } from 'tsdown';

export default defineConfig({
  // Workspace configuration - builds all library packages from root
  workspace: {
    include: ['packages/*', 'plugins/*', 'tools/*', 'tegg/core/*', 'tegg/plugin/*', 'tegg/standalone/*'],
    exclude: [
      'packages/tsconfig', // Config-only package, no src to build
      'packages/skills', // Pure markdown package, no src to build
      'dist',
    ],
  },

  // Shared defaults
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
    // Default to npm pack so main CI (utoo env, no pnpm binary) works.
    // E2E workflow overrides via PUBLINT_PACK=pnpm because running npm pack
    // against pnpm's symlinked node_modules is ~10x slower per package.
    pack: (process.env.PUBLINT_PACK as 'npm' | 'pnpm' | 'yarn' | 'bun' | undefined) ?? 'npm',
  },

  // Default entry pattern - glob to include all source files
  entry: 'src/**/*.ts',
  // should set unbundle and external together, avoid bundle @eggjs/* and egg packages
  unbundle: true,
  external: [/^@eggjs\//, 'egg'],
});
