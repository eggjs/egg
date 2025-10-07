# egg-errors

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/eggjs/egg-errors/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eggjs/egg-errors/actions/workflows/nodejs.yml)
[![Test coverage][codecov-image]][codecov-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-errors.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-errors
[codecov-image]: https://codecov.io/gh/eggjs/egg-errors/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/eggjs/egg-errors
[snyk-image]: https://snyk.io/test/npm/egg-errors/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-errors
[download-image]: https://img.shields.io/npm/dm/egg-errors.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-errors

Errors for [Egg.js](https://eggjs.org)

egg-errors provide two kinds of errors that is Error and Exception.

- Exception is system error that egg will log an error and throw exception, but it will be catched by onerror plugin.
- Error is business error that egg will transform it to response.

## Install

```bash
$ npm i egg-errors --save
```

## Usage

Create an Error

```js
const { EggError, EggException } = require('egg-errors');
let err = new EggError('egg error');
console.log(EggError.getType(err)); // ERROR
```

Create an Exception

```js
err = new EggException('egg exception');
console.log(EggException.getType(err)); // EXCEPTION
```

You can import an error from an normal error object

```js
err = new Error('normal error');
console.log(EggError.getType(err)); // BUILTIN
err = EggError.from(err);
console.log(EggError.getType(err)); // ERROR
```

### Customize Error

Error can be extendable.

```js
const { EggBaseError } = require('egg-errors');

class CustomError extends EggBaseError {
  constructor(message) {
    super({ message, code: 'CUSTOM_CODE' });
  }
}
```

or using typescript you can customize ErrorOptions.

```js
import { EggBaseError, ErrorOptions } from 'egg-errors';

class CustomErrorOptions extends ErrorOptions {
  public data: object;
}
class CustomError extends EggBaseError<CustomErrorOptions> {
  public data: object;
  protected options: CustomErrorOptions;

  constructor(options?: CustomErrorOptions) {
    super(options);
    this.data = this.options.data;
  }
}
```

Recommend use message instead of options in user land that it can be easily understood by developer, see [http error](https://github.com/eggjs/egg-errors/blob/master/lib/http/400.ts).

### HTTP Errors

HTTP Errors is BUILTIN errors that transform 400 ~ 500 status code to error objects. HttpError extends EggBaseError providing two properties which is `status` and `headers`;

```js
const { ForbiddenError } = require('egg-errors');
const err = new ForbiddenError('your request is forbidden');
console.log(err.status); // 403
```

Support short name too:

```js
const { E403 } = require('egg-errors');
const err = new E403('your request is forbidden');
console.log(err.status); // 403
```

### FrameworkBaseError

FrameworkBaseError is for egg framework/plugin developer to throw framework error.it can format by FrameworkErrorFormater

FrameworkBaseError extends EggBaseError providing three properties which is `module`、`serialNumber` and `errorContext`

FrameworkBaseError could not be used directly, framework/plugin should extends like this

```js
const { FrameworkBaseError } = require('egg-errors');

class EggMysqlError extends FrameworkBaseError {
  // module should be implement
  get module() {
    return 'EGG_MYSQL';
  }
}

const err = new EggMysqlError('error message', '01', { traceId: 'xxx' });
console.log(err.module); // EGG_MYSQL
console.log(err.serialNumber); // 01
console.log(err.code); // EGG_MYSQL_01
console.log(err.errorContext); // { traceId: 'xxx' }
```

#### create frameworkError with formater

use the static method `.create(message: string, serialNumber: string | number, errorContext?: any)` to new a frameworkError and format it convenient

```js
const { FrameworkBaseError } = require('egg-errors');

class EggMysqlError extends FrameworkBaseError {
  // module should be implement
  get module() {
    return 'EGG_MYSQL';
  }
}

const err = EggMysqlError.create('error message', '01', { traceId: 'xxx' });
console.log(err.message);
// =>
framework.EggMysqlError: error message [ https://eggjs.org/zh-cn/faq/EGG_MYSQL/01 ]
```

### FrameworkErrorFormater

FrameworkErrorFormater will append a faq guide url in error message.this would be helpful when developer encountered a framework error

the faq guide url format: `${faqPrefix}/${err.module}/${err.serialNumber}`, `faqPrefix` is `https://eggjs.org/zh-cn/faq` by default. can be extendable or set `process.env.EGG_FRAMEWORK_ERR_FAQ_PERFIX` to override it.

```js
const { FrameworkErrorFormater } = require('egg-errors');

class CustomErrorFormatter extends FrameworkErrorFormater {
  static faqPrefix = 'http://www.custom.com/faq';
}
```

#### .format(err)

format error to message, it will not effect origin error

```js
const { FrameworkBaseError, FrameworkErrorFormater } = require('egg-errors');

class EggMysqlError extends FrameworkBaseError {
  // module should be implement
  get module() {
    return 'EGG_MYSQL';
  }
}

const message = FrameworkErrorFormater.format(new EggMysqlError('error message', '01'));
console.log(message);
// => message format like this
framework.EggMysqlError: error message [ https://eggjs.org/zh-cn/faq/EGG_MYSQL/01 ]
...stack
...
code: "EGG_MYSQL_01"
serialNumber: "01"
errorContext:
pid: 66568
hostname: xxx


// extends
class CustomErrorFormatter extends FrameworkErrorFormater {
  static faqPrefix = 'http://www.custom.com/faq';
}
const message = CustomErrorFormatter.format(new EggMysqlError('error message', '01'));
console.log(message);
// =>
framework.EggMysqlError: error message [ http://www.custom.com/faq/EGG_MYSQL/01 ]
...
```

#### .formatError(err)

append faq guide url to err.message

```js
const { FrameworkBaseError, FrameworkErrorFormater } = require('egg-errors');

class EggMysqlError extends FrameworkBaseError {
  // module should be implement
  get module() {
    return 'EGG_MYSQL';
  }
}

const err = FrameworkErrorFormater.formatError(new EggMysqlError('error message', '01'));
console.log(err.message); // error message [ https://eggjs.org/zh-cn/faq/EGG_MYSQL/01 ]
```

### Available Errors

```
BaseError
|- EggBaseError
|  |- EggError
|  |- HttpError
|  |  |- NotFoundError, alias to E404
|  |  `- ...
|  |- FrameworkBaseError
|  `- CustomError
`- EggBaseException
   |- EggException
   `- CustomException
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc).

## License

[MIT](LICENSE)

<!-- GITCONTRIBUTOR_START -->

## Contributors

| [<img src="https://avatars.githubusercontent.com/u/360661?v=4" width="100px;"/><br/><sub><b>popomore</b></sub>](https://github.com/popomore)<br/> | [<img src="https://avatars.githubusercontent.com/u/2160731?v=4" width="100px;"/><br/><sub><b>mansonchor</b></sub>](https://github.com/mansonchor)<br/> | [<img src="https://avatars.githubusercontent.com/u/156269?v=4" width="100px;"/><br/><sub><b>fengmk2</b></sub>](https://github.com/fengmk2)<br/> | [<img src="https://avatars.githubusercontent.com/u/12657964?v=4" width="100px;"/><br/><sub><b>beliefgp</b></sub>](https://github.com/beliefgp)<br/> | [<img src="https://avatars.githubusercontent.com/u/19644997?v=4" width="100px;"/><br/><sub><b>sm2017</b></sub>](https://github.com/sm2017)<br/> |
| :-----------------------------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------: |

This project follows the git-contributor [spec](https://github.com/xudafeng/git-contributor), auto updated at `Tue Feb 22 2022 11:32:47 GMT+0800`.

<!-- GITCONTRIBUTOR_END -->
