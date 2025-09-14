# @eggjs/watcher

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/eggjs/watcher/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eggjs/watcher/actions/workflows/nodejs.yml)
[![Test coverage][codecov-image]][codecov-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/watcher.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/watcher.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/watcher
[codecov-image]: https://codecov.io/github/eggjs/watcher/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/eggjs/watcher?branch=master
[snyk-image]: https://snyk.io/test/npm/@eggjs/watcher/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/watcher
[download-image]: https://img.shields.io/npm/dm/@eggjs/watcher.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/watcher

File watcher plugin for egg

## Usage

In worker process:

### app.watcher.watch(path, listener)

Start watching file(s).

- path(String|Array): file path(s)
- listener(Function): file change callback

### app.watcher.unwatch(path[, listener])

Stop watching file(s).

- path(String|Array): file path(s)
- listener(Function): file change callback

In agent process:

### agent.watcher.watch(path, listener)

Start watching file(s).

- path(String|Array): file path(s)
- listener(Function): file change callback

### agent.watcher.unwatch(path[, listener])

Stop watching file(s).

- path(String|Array): file path(s)
- listener(Function): file change callback

## Watching mode

### `development` Mode

There's a built-in [development mode](https://github.com/eggjs/watcher/blob/master/src/lib/event-sources/development.ts) which works in local(env is `local`). Once files on disk is modified it will emit a `change` event immediately.

### Customize Watching Mode

Say we want to build a custom event source plugin (package name: `egg-watcher-custom`, eggPlugin.name: `watcherCustom`).

Firstly define our custom event source like this:

```ts
// {plugin_root}/lib/custom_event_source.js
import { Base } from 'sdk-base';

export default class CustomEventSource extends Base {
  // `opts` comes from app.config[${eventSourceName}]
  // `eventSourceName` will be registered later in
  // `config.watcher.eventSources` as the key shown below
  constructor(opts) {
    super(opts);
    this.ready(true);
  }

  watch(path) {
    // replace this with your desired way of watching,
    // when aware of any change, emit a `change` event
    // with an info object containing `path` property
    // specifying the changed directory or file.
    this._h = setInterval(() => {
      this.emit('change', { path });
    }, 1000);
  }

  unwatch() {
    // replace this with your implementation
    if (this._h) {
      clearInterval(this._h);
    }
  }
}
```

Event source implementations varies according to your running environment. When working with vagrant, docker, samba or such other non-standard way of development, you should use a different watch API specific to what you are working with.

Then add your custom event source to config:

```js
// config/config.default.js
import CustomEventSource from '../lib/custom_event_source';

export default {
  watcher: {
    eventSources: {
      custom: CustomEventSource,
    },
  },
};
```

Choose to use your custom watching mode in your desired env.

```js
// config/config.${env}.js

export default {
  watcher: {
    type: 'custom',
  },

  // this will pass to your CustomEventSource constructor as opts
  watcherCustom: {
    // foo: 'bar',
  },
};
```

If possible, plugins named like `egg-watcher-${customName}`(`egg-watcher-vagrant` eg.) are recommended.

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/watcher)](https://github.com/eggjs/watcher/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
