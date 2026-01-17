import { beforeAll, afterAll } from 'vite-plus/test';

// https://vitest.dev/config/#setupfiles
// export beforeAll and afterAll to globalThis, let @eggjs/mock/bootstrap use it
Object.assign(globalThis, { beforeAll, afterAll });
