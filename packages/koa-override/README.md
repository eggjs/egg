# @eggjs/koa-override

Method override middleware for Koa. It lets clients use HTTP verbs such as
`PUT` or `DELETE` when they cannot send those methods directly.

## Install

```bash
npm install @eggjs/koa-override
```

## Usage

```ts
import bodyParser from 'koa-bodyparser';
import override from '@eggjs/koa-override';

app.use(bodyParser());
app.use(override());
```

## API

### `override(options?)`

When a request body exists, the middleware checks `body._method` first. It
otherwise checks the `X-HTTP-Method-Override` header.

By default, only `POST` requests may be overridden. Use `allowedMethods` to
change that list:

```ts
app.use(override({ allowedMethods: ['POST', 'PUT'] }));
```

## License

[MIT](LICENSE)
