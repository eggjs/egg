# @eggjs/supertest

[![NPM version][npm-image]][npm-url]
[![code coverage][coverage-badge]][coverage]
[![Node.js CI](https://github.com/eggjs/supertest/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eggjs/supertest/actions/workflows/nodejs.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
[![MIT License][license-badge]][license]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/mock.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/supertest.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/supertest
[coverage-badge]: https://img.shields.io/codecov/c/github/eggjs/supertest.svg
[coverage]: https://codecov.io/gh/eggjs/supertest
[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[license]: https://github.com/eggjs/supertest/blob/master/LICENSE
[download-image]: https://img.shields.io/npm/dm/@eggjs/supertest.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/supertest

> HTTP assertions made easy via [superagent](http://github.com/ladjs/superagent).  Maintained for [Forward Email](https://github.com/forwardemail) and [Lad](https://github.com/ladjs).
> Forked for TypeScript friendly

Document see [SuperTest](https://ladjs.github.io/superagent/)

## About

The motivation with this module is to provide a high-level abstraction for testing
HTTP, while still allowing you to drop down to the [lower-level API](https://ladjs.github.io/superagent/) provided by superagent.

## Getting Started

Install SuperTest as an npm module and save it to your package.json file as a development dependency:

```bash
npm install @eggjs/supertest --save-dev
```

  Once installed it can now be referenced by simply calling ```require('supertest');```

## Example

You may pass an `http.Server`, or a `Function` to `request()` - if the server is not
already listening for connections then it is bound to an ephemeral port for you so
there is no need to keep track of ports.

SuperTest works with any test framework, here is an example without using any
test framework at all:

```js
const { request } = require('@eggjs/supertest');
const express = require('express');

const app = express();

app.get('/user', function(req, res) {
  res.status(200).json({ name: 'john' });
});

request(app)
  .get('/user')
  .expect('Content-Type', /json/)
  .expect('Content-Length', '15')
  .expect(200)
  .end(function(err, res) {
    if (err) throw err;
  });
```

To enable http2 protocol, simply append an options to `request` or `request.agent`:

```js
const { request } = require('@eggjs/supertest');
const express = require('express');

const app = express();

app.get('/user', function(req, res) {
  res.status(200).json({ name: 'john' });
});

request(app, { http2: true })
  .get('/user')
  .expect('Content-Type', /json/)
  .expect('Content-Length', '15')
  .expect(200)
  .end(function(err, res) {
    if (err) throw err;
  });

request.agent(app, { http2: true })
  .get('/user')
  .expect('Content-Type', /json/)
  .expect('Content-Length', '15')
  .expect(200)
  .end(function(err, res) {
    if (err) throw err;
  });
```

Here's an example with mocha, note how you can pass `done` straight to any of the `.expect()` calls:

```js
describe('GET /user', function() {
  it('responds with json', function(done) {
    request(app)
      .get('/user')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
```

You can use `auth` method to pass HTTP username and password in the same way as in the [superagent](http://ladjs.github.io/superagent/#authentication):

```js
describe('GET /user', function() {
  it('responds with json', function(done) {
    request(app)
      .get('/user')
      .auth('username', 'password')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});
```

One thing to note with the above statement is that superagent now sends any HTTP
error (anything other than a 2XX response code) to the callback as the first argument if
you do not add a status code expect (i.e. `.expect(302)`).

If you are using the `.end()` method `.expect()` assertions that fail will
not throw - they will return the assertion as an error to the `.end()` callback. In
order to fail the test case, you will need to rethrow or pass `err` to `done()`, as follows:

```js
describe('POST /users', function() {
  it('responds with json', function(done) {
    request(app)
      .post('/users')
      .send({name: 'john'})
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        return done();
      });
  });
});
```

You can also use promises:

```js
describe('GET /users', function() {
  it('responds with json', function() {
    return request(app)
      .get('/users')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .then(response => {
         expect(response.body.email).toEqual('foo@bar.com');
      })
  });
});
```

Or async/await syntax:

```js
describe('GET /users', function() {
  it('responds with json', async function() {
    const response = await request(app)
      .get('/users')
      .set('Accept', 'application/json')
    expect(response.headers["Content-Type"]).toMatch(/json/);
    expect(response.status).toEqual(200);
    expect(response.body.email).toEqual('foo@bar.com');
  });
});
```

Expectations are run in the order of definition. This characteristic can be used
to modify the response body or headers before executing an assertion.

```js
describe('POST /user', function() {
  it('user.name should be an case-insensitive match for "john"', function(done) {
    request(app)
      .post('/user')
      .send('name=john') // x-www-form-urlencoded upload
      .set('Accept', 'application/json')
      .expect(function(res) {
        res.body.id = 'some fixed id';
        res.body.name = res.body.name.toLowerCase();
      })
      .expect(200, {
        id: 'some fixed id',
        name: 'john'
      }, done);
  });
});
```

Anything you can do with superagent, you can do with supertest - for example multipart file uploads!

```js
request(app)
  .post('/')
  .field('name', 'my awesome avatar')
  .field('complex_object', '{"attribute": "value"}', {contentType: 'application/json'})
  .attach('avatar', 'test/fixtures/avatar.jpg')
  ...
```

Passing the app or url each time is not necessary, if you're testing
the same host you may simply re-assign the request variable with the
initialization app or url, a new `Test` is created per `request.VERB()` call.

```js
t = request('http://localhost:5555');

t.get('/').expect(200, function(err){
  console.log(err);
});

t.get('/').expect('heya', function(err){
  console.log(err);
});
```

Here's an example with mocha that shows how to persist a request and its cookies:

```js
const { agent } = require('@eggjs/supertest');
const should = require('should');
const express = require('express');
const cookieParser = require('cookie-parser');

describe('request.agent(app)', function() {
  const app = express();
  app.use(cookieParser());

  app.get('/', function(req, res) {
    res.cookie('cookie', 'hey');
    res.send();
  });

  app.get('/return', function(req, res) {
    if (req.cookies.cookie) res.send(req.cookies.cookie);
    else res.send(':(')
  });

  const testAgent = agent(app);

  it('should save cookies', function(done) {
    testAgent
    .get('/')
    .expect('set-cookie', 'cookie=hey; Path=/', done);
  });

  it('should send cookies', function(done) {
    testAgent
    .get('/return')
    .expect('hey', done);
  });
});
```

There is another example that is introduced by the file [agency.js](https://github.com/ladjs/superagent/blob/master/test/node/agency.js)

Here is an example where 2 cookies are set on the request.

```js
agent(app)
  .get('/api/content')
  .set('Cookie', ['nameOne=valueOne;nameTwo=valueTwo'])
  .send()
  .expect(200)
  .end((err, res) => {
    if (err) {
      return done(err);
    }
    expect(res.text).to.be.equal('hey');
    return done();
  });
```

## API

You may use any [superagent](http://github.com/ladjs/superagent) methods,
including `.write()`, `.pipe()` etc and perform assertions in the `.end()` callback
for lower-level needs.

### .expect(status[, fn])

Assert response `status` code.

### .expect(status, body[, fn])

Assert response `status` code and `body`.

### .expect(body[, fn])

Assert response `body` text with a string, regular expression, or
parsed body object.

### .expect(field, value[, fn])

Assert header `field` `value` with a string or regular expression.

### .expect(function(res) {})

Pass a custom assertion function. It'll be given the response object to check. If the check fails, throw an error.

```js
request(app)
  .get('/')
  .expect(hasPreviousAndNextKeys)
  .end(done);

function hasPreviousAndNextKeys(res) {
  if (!('next' in res.body)) throw new Error("missing next key");
  if (!('prev' in res.body)) throw new Error("missing prev key");
}
```

### .end(fn)

Perform the request and invoke `fn(err, res)`.

## Notes

Inspired by [api-easy](https://github.com/flatiron/api-easy) minus vows coupling.

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/supertest)](https://github.com/eggjs/supertest/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
