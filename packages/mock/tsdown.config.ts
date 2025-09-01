import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    bootstrap: 'src/bootstrap.ts',
    register: 'src/register.ts',
  },
  unbundle: true, // unbundle mode - preserves file structure
});