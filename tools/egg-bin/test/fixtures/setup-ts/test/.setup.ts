import { beforeAll, afterEach } from 'vitest';

beforeAll(() => {
  console.log('this is a before function');
});
afterEach(() => {
  console.log('is end!');
});
