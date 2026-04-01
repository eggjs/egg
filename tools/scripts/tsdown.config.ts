import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/**/*.ts',
  unbundle: true,
  external: [/^@eggjs\//, 'egg'],
  unused: {
    level: 'error',
    // tsx is used at runtime via --import=tsx/esm in spawned processes, not directly imported
    ignore: ['tsx', 'runscript'],
  },
});
