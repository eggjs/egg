import { defineConfig, type UserConfig } from 'tsdown';

import baseConfig from '../../tsdown.config.json' with { type: 'json' };

const config: UserConfig = defineConfig({
  ...(baseConfig as UserConfig),
  entry: {
    index: 'src/index.ts',
    agent_worker: 'src/agent_worker.ts',
    app_worker: 'src/app_worker.ts',
  },
});

export default config;
