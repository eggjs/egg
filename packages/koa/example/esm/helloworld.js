import { Application } from '@eggjs/koa';

const app = new Application();

// response
app.use(ctx => {
  ctx.body = `Hello World, ESM!`;
});

app.listen(3000);

console.log('Server is running on port 3000');
