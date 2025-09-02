import mm from '../src/index.ts';
import { getFixtures } from './helper.ts';

const app = mm.cluster({
  baseDir: getFixtures('simple'),
});
await app.ready();

const res = await app.httpRequest().get('/').expect('hi');

console.log(res.statusCode, res.headers, res.text);

await app.close();
