import { defineConfig } from 'vite-plus/lib';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    agent_worker: 'src/agent_worker.ts',
    app_worker: 'src/app_worker.ts',
  },
});
