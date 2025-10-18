# @eggjs/view-nunjucks

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@eggjs/view-nunjucks.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/view-nunjucks
[snyk-image]: https://snyk.io/test/npm/@eggjs/view-nunjucks/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/view-nunjucks
[download-image]: https://img.shields.io/npm/dm/@eggjs/view-nunjucks.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/view-nunjucks

[nunjucks](http://mozilla.github.io/nunjucks/) view plugin for egg.

## Install

```bash
npm install @eggjs/view-nunjucks
pnpm add @eggjs/view-nunjucks
yarn add @eggjs/view-nunjucks
```

## Usage

Enable plugin in `config/plugin.ts`

```ts
export default {
  nunjucks: {
    enable: true,
    package: '@eggjs/view-nunjucks',
  },
};
```

Set mapping in `config/config.default.ts`

```ts
import { defineConfig } from 'egg';

export default defineConfig({
  view: {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.nj': 'nunjucks',
    },
  },
});
```

Render in controller by `ctx.render`

```ts
// {app_root}/app/controller/test.ts
import { Controller } from 'egg';

class TestController extends Controller {
  async list() {
    const ctx = this.ctx;
    // ctx.body = await ctx.renderString('{{ name }}', { name: 'local' });
    // not need to assign `ctx.render` to `ctx.body`
    // https://github.com/mozilla/nunjucks/blob/6f3e4a36a71cfd59ddc8c1fc5dcd77b8c24d83f3/nunjucks/src/environment.js#L318
    await ctx.render(
      'test.nj',
      { name: 'view test' },
      {
        path: '***',
      }
    );
  }
}
```

## Features

### Filter

- `escape` filter is replaced by `helper.escape` which is provided by [@eggjs/security](https://github.com/eggjs/egg/tree/next/plugins/security) for better performance
- Add your filters to `app/extend/filter.ts`, then they will be injected automatically to nunjucks

```ts
// {app_root}/app/extend/filter.ts
export const hello = (name: string) => `hi, ${name}`;

// so you could use it at template
// {app_root}/app/controller/test.ts
import { Controller } from 'egg';

class TestController extends Controller {
  async list() {
    const ctx = this.ctx;
    ctx.body = await ctx.renderString(
      '{{ name | hello }}',
      { name: 'egg' },
      {
        path: '***',
      }
    );
  }
}
```

### Tag

you can extend custom tag like this:

```ts
// {app_root}/app/extend/application.ts
import type { Application, ILifecycleBoot } from 'egg';
import markdown from 'nunjucks-markdown';
import { marked } from 'marked';

export default class AppBoot implements ILifecycleBoot {
  app: Application;
  constructor(app: Application) {
    this.app = app;
  }

  async didLoad(): Promise<void> {
    markdown.register(app.nunjucks, marked);
  }
}
```

### Security

see [@eggjs/security](https://github.com/eggjs/egg/tree/next/plugins/security)

- auto inject `_csrf` attr to form field
- auto inject `nonce` attr to script tag

### Helper / Locals

- you can use `helper/ctx/request` in template, such as `helper.shtml('<div></div>')`
- nunjucks build-in filters is injected to helper, such as `helper.upper('test')`
- `helper.shtml/surl/sjs/escape` is auto wrapped with `safe`

### More

- `app.nunjucks` - nunjucks environment
- `app.nunjucks.cleanCache(fullPath/tplName)` to easy clean cache, can use with custom [@eggjs/watcher](https://github.com/eggjs/egg/tree/next/plugins/watcher)

## Configuration

see [config/config.default.ts](https://github.com/eggjs/egg/blob/next/plugins/view-nunjucks/src/config/config.default.ts) for more details.

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
