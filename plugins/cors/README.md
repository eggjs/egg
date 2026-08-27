# @eggjs/cors

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) plugin for Egg,
based on [@koa/cors](https://github.com/koajs/cors).

## Install

```bash
npm install @eggjs/cors
```

## Usage

```ts
// config/plugin.ts
import corsPlugin from '@eggjs/cors';

export default {
  ...corsPlugin(),
};
```

When no custom `origin` is configured, the plugin uses the Security plugin's
`domainWhiteList`. Without the Security plugin, the request origin is allowed.

## Configuration

All [@koa/cors options](https://github.com/koajs/cors#corsoptions) are supported.

```ts
// config/config.default.ts
export default {
  cors: {
    origin: 'https://example.com',
    credentials: true,
  },
};
```

A custom `origin` takes precedence over `security.domainWhiteList`.

## License

[MIT](LICENSE)
