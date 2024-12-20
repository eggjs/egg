/* eslint-disable @typescript-eslint/no-var-requires */
const { once } = require('node:events');
const { Application } = require('../../dist/commonjs/index');

const app = new Application({
  baseDir: process.cwd(),
  mode: 'single',
});

async function main() {
  await app.ready();
  console.log('egg app ready');

  const server = app.listen(7001);
  await once(server, 'listening');
  console.log(`egg app server listening at http://localhost:${server.address().port}`);
}

main();
