# @eggjs/errors

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@eggjs/errors.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/errors
[snyk-image]: https://snyk.io/test/npm/@eggjs/errors/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/errors
[download-image]: https://img.shields.io/npm/dm/@eggjs/errors.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/errors

Errors for [Egg.js](https://eggjs.org)

`@eggjs/errors` provide two kinds of errors that is Error and Exception.

- Exception is system error that egg will log an error and throw exception, but it will be catched by onerror plugin.
- Error is business error that egg will transform it to response.

## Install

```bash
$ npm i @eggjs/errors --save
```

## Usage

Create an Error

```js
const { EggError, EggException } = require('@eggjs/errors');
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
const { EggBaseError } = require('@eggjs/errors');

class CustomError extends EggBaseError {
  constructor(message) {
    super({ message, code: 'CUSTOM_CODE' });
  }
}
```

or using typescript you can customize ErrorOptions.

```js
import { EggBaseError, ErrorOptions } from '@eggjs/errors';

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

Recommend use message instead of options in user land that it can be easily understood by developer, see [http error](https://github.com/eggjs/egg/blob/master/packages/errors/src/http/400.ts).

### HTTP Errors

HTTP Errors is BUILTIN errors that transform 400 ~ 500 status code to error objects. HttpError extends EggBaseError providing two properties which is `status` and `headers`;

```js
const { ForbiddenError } = require('@eggjs/errors');

const err = new ForbiddenError('your request is forbidden');
console.log(err.status); // 403
```

Support short name too:

```js
const { E403 } = require('@eggjs/errors');

const err = new E403('your request is forbidden');
console.log(err.status); // 403
```

### FrameworkBaseError

FrameworkBaseError is for egg framework/plugin developer to throw framework error.it can format by FrameworkErrorFormater

FrameworkBaseError extends EggBaseError providing three properties which is `module`、`serialNumber` and `errorContext`

FrameworkBaseError could not be used directly, framework/plugin should extends like this

```js
const { FrameworkBaseError } = require('@eggjs/errors');

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
const { FrameworkBaseError } = require('@eggjs/errors');

class EggMysqlError extends FrameworkBaseError {
  // module should be implement
  get module() {
    return 'EGG_MYSQL';
  }
}

const err = EggMysqlError.create('error message', '01', { traceId: 'xxx' });
console.log(err.message);
// =>
framework.EggMysqlError: error message [ https://eggjs.org/faq/EGG_MYSQL/01 ]
```

### FrameworkErrorFormater

FrameworkErrorFormater will append a faq guide url in error message.this would be helpful when developer encountered a framework error

the faq guide url format: `${faqPrefix}/${err.module}/${err.serialNumber}`, `faqPrefix` is `https://eggjs.org/faq` by default. It can be extended or overridden by setting `process.env.EGG_FRAMEWORK_ERR_FAQ_PREFIX` (recommended) or, for backward compatibility, `process.env.EGG_FRAMEWORK_ERR_FAQ_PERFIX` (legacy typo).

```js
const { FrameworkErrorFormater } = require('@eggjs/errors');

class CustomErrorFormatter extends FrameworkErrorFormater {
  static faqPrefix = 'http://www.custom.com/faq';
}
```

#### .format(err)

format error to message, it will not effect origin error

```js
const { FrameworkBaseError, FrameworkErrorFormater } = require('@eggjs/errors');

class EggMysqlError extends FrameworkBaseError {
  // module should be implement
  get module() {
    return 'EGG_MYSQL';
  }
}

const message = FrameworkErrorFormater.format(new EggMysqlError('error message', '01'));
console.log(message);
// => message format like this
framework.EggMysqlError: error message [ https://eggjs.org/faq/EGG_MYSQL/01 ]
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
const { FrameworkBaseError, FrameworkErrorFormater } = require('@eggjs/errors');

class EggMysqlError extends FrameworkBaseError {
  // module should be implement
  get module() {
    return 'EGG_MYSQL';
  }
}

const err = FrameworkErrorFormater.formatError(new EggMysqlError('error message', '01'));
console.log(err.message); // error message [ https://eggjs.org/faq/EGG_MYSQL/01 ]
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

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
