import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: {
    index: 'src/index.ts',
    agent_worker: 'src/agent_worker.ts',
    app_worker: 'src/app_worker.ts',
  },
});

export default config;
