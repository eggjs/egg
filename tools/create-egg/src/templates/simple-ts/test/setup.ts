import { beforeAll, afterAll } from 'vitest';

// https://vitest.dev/config/#setupfiles
// export beforeAll and afterAll to globalThis, let @eggjs/mock/bootstrap use it

// @ts-expect-error globalThis is not typed
globalThis.beforeAll = beforeAll;
// @ts-expect-error globalThis is not typed
globalThis.afterAll = afterAll;
