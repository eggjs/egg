import Koa from '../src/index.ts';

const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello World, TypeScript!';
});

app.listen(3000);

console.log('Server is running on port 3000');
