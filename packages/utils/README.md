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

Register a module loader hook for bundled Egg apps. The hook runs before the
normal `importModule()` resolution path.

- {Function | undefined} loader - a synchronous function that receives the
  original `filepath` argument passed to `importModule()` after POSIX separator
  normalization, or a virtual specifier. It does not receive the resolved
  absolute file path from `importResolve()`. Return `undefined` to fall back to
  the normal import path.

The bundle loader is stored on `globalThis`, so bundled and external copies of
`@eggjs/utils` share the same loader. Non-`undefined` results follow the same
default export unwrapping rules as `importModule()`, including
`importDefaultOnly`.

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
