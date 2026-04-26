# @eggjs/utils

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/utils.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/utils.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/utils
[download-image]: https://img.shields.io/npm/dm/@eggjs/utils.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/utils

Utils for all egg projects.

## Installation

```bash
npm i @eggjs/utils
```

## API

### `getPlugins(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework
- {String} env - egg environment

### `getLoadUnits(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework
- {String} env - egg environment

### `getConfig(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework
- {String} env - egg environment

### `getFrameworkPath(options)`

- {String} baseDir - the current directory of application
- {String} framework - the directory of framework

### `setBundleModuleLoader(loader)`

Register a bundle module loader for `importModule()`. The loader is shared globally via `globalThis` across all instances of `@eggjs/utils` in the same process.

- {Function|undefined} loader - a synchronous hook called with a POSIX-normalized filepath or virtual specifier before normal module resolution.

Return `undefined` from the loader to fall back to standard module resolution. Otherwise, return the module exports synchronously; any non-`undefined` return value is treated as a bundle hit and uses the same default export handling as `importModule()`, including `importDefaultOnly` and double-default `__esModule` compatibility.

The loader must not be an `async` function or return a `Promise`, because `importModule()` does not `await` the hook.

Pass `undefined` to clear the registered loader.

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
