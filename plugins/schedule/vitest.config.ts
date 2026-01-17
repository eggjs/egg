import { defineProject } from 'vite-plus';

export default defineProject({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
