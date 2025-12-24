import { defineConfig } from '@voidzero-dev/vite-plus';

import tsdownConfig from './tsdown.config.js';

export default defineConfig({
  lib: tsdownConfig,
});
