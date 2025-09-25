import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    agent_worker: 'src/agent_worker.ts',
    app_worker: 'src/app_worker.ts',
  },
  unbundle: true,
  dts: true,
  exports: {
    devExports: true,
  },
});
