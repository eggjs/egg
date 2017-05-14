title: Build RESTful API
---
Web frameworks are widely used for providing interfaces to the client through web services . Let's use an example [CNode Club](https://cnodejs.org/) to show how to build [RESTful](https://en.wikipedia.org/wiki/REST) API using Egg.

CNode currently use v1 interface is not fully consistent with the RESTful semantic. In the article, we will encapsulate a more RESTful semantic V2 API based on CNode V1 interface.

## Response Formatting

Designing a RESTful-style API, we will identify the status of response by the response status code which simply the body of response then only the interface data is returned. 
A example of `topics` is shown below:

### Get topics list

- `GET /api/v2/topics` 
- status code: 200
- response body:

```json
[
  {
    "id": "57ea257b3670ca3f44c5beb6",
    "author_id": "541bf9b9ad60405c1f151a03",
    "tab": "share",
    "content": "content",
    "last_reply_at": "2017-01-11T13:32:25.089Z",
    "good": false,
    "top": true,
    "reply_count": 155,
    "visit_count": 28176,
    "create_at": "2016-09-27T07:53:31.872Z",
  },
  {
    "id": "57ea257b3670ca3f44c5beb6",
    "author_id": "541bf9b9ad60405c1f151a03",
    "tab": "share",
    "content": "content",
    "title": "《一起学 Node.js》彻底重写完毕",
    "last_reply_at": "2017-01-11T10:20:56.496Z",
    "good": false,
    "top": true,
    "reply_count": 193,
    "visit_count": 47633,
  },
]
```

### Retrieve one topic

- `GET /api/v2/topics/57ea257b3670ca3f44c5beb6`
- status code: 200
- response body:

```json
{
  "id": "57ea257b3670ca3f44c5beb6",
  "author_id": "541bf9b9ad60405c1f151a03",
  "tab": "share",
  "content": "content",
  "title": "《一起学 Node.js》彻底重写完毕",
  "last_reply_at": "2017-01-11T10:20:56.496Z",
  "good": false,
  "top": true,
  "reply_count": 193,
  "visit_count": 47633,
}
```

### Create topics

- `POST /api/v2/topics`
- status code: 201
- response body:

```
{
  "topic_id": "57ea257b3670ca3f44c5beb6"
}
```

### Update topics

- `PUT /api/v2/topics/57ea257b3670ca3f44c5beb6`
- status code: 204
- response body: null

### Error handling

When an error is occurring, 4xx status code is returned if occurred by client-side request parameters and 5xx status code is returned if occurred by server-side logic processing. All error objects are used as the description for status exceptions.

For example, passing invalided parameters from the client may return a response with status code 422, the response body as shown below: 
```json
{
  "error": "Validation Failed",
  "detail": [ { "message": "required", "field": "title", "code": "missing_field" } ]
}
```

## Getting Started

After interface convention, we begin to create a RESTful API.

### Application initialization

Initializes the application using [egg-init](https://github.com/eggjs/egg-init) in the [quickstart](../intro/quickstart.md)

```bash
$ egg-init cnode-api --type=empty
$ cd cnode-api
$ npm i
```

### Enable validate plugin

[egg-validate](https://github.com/eggjs/egg-validate) is used to present the validate plugin.

```js
// config/plugin.js
exports.validate = {
  enable: true,
  package: 'egg-validate',
};
```

### Router registry

First of all, we follower previous design to register [router](../basics/router.md). The framework provides a simply way to create a RESTful-style router and mapping the resources to the corresponding controllers.

```js
// app/router.js
module.exports = app => {
  app.resources('topics', '/api/v2/topics', 'topics');
};
```

Mapping the 'topics' resource's CRUD interfaces to the `app/controller/topics.js` using `app.resources`

### Developing controller

In [controller](../basics/controller.md), we only need to implement the interface convention of `app.resources` [RESTful style URL definition](../basics/router.md#RESTful-style-URL-definition). For example, creating a 'topics' interface:

```js
// app/controller/topics.js
// defining the rule of request parameters
const createRule = {
  accesstoken: 'string',
  title: 'string',
  tab: { type: 'enum', values: [ 'ask', 'share', 'job' ], required: false },
  content: 'string',
};
exports.create = function* (ctx) {
  // validate the `ctx.request.body` with the expected format
  // status = 422 exception will be thrown if not passing the parameter validation
  ctx.validate(createRule);
  // call service to create a topic
  const id = yield ctx.service.topics.create(ctx.request.body);
  // configure the response body and status code
  ctx.body = {
    topic_id: id,
  };
  ctx.status = 201;
};
```

As shown above, a controller mainly implements the following logic:

1. call the validate function to validate the request parameters
2. create a topic by calling service encapsulates business logic using the validated parameters
3. configure the status code and context according to the interface convention

### Developing service

We will more focus on writing effective business logic in [service](../basics/service.md).

```js
// app/service/topics.js
module.exports = app => {
  class TopicService extends app.Service {
    constructor(ctx) {
      super(ctx);
      this.root = 'https://cnodejs.org/api/v1';
    }

    * create(params) {
      // call CNode V1 API
      const result = yield this.ctx.curl(`${this.root}/topics`, {
        method: 'post',
        data: params,
        dataType: 'json',
        contentType: 'json',
      });
      // check whether the call was successful, throws an exception if it fails
      this.checkSuccess(result);
      // return the id of topis
      return result.data.topic_id;
    }

    // Encapsulated a uniform check function, can be reused in query, create, update and such on in service
    checkSuccess(result) {
      if (result.status !== 200) {
        const errorMsg = result.data && result.data.error_msg ? result.data.error_msg : 'unknown error';
        this.ctx.throw(result.status, errorMsg);
      }
      if (!result.data.success) {
        // remote response error 
        this.ctx.throw(500, 'remote response error', { data: result.data });
      }
    }
  }

  return TopicService;
};
```

After developing the service of topic creation, an interface have been completed from top to bottom.

### Unified error handling

Normal business logic has been completed, but exceptions have not yet been processed. Controller and service may throw an exception as the previous coding, so it is recommended that throwing an exception to interrupt if passing invalided parameters from the client or calling the back-end service with exception.

- use controller `this.validate()` to validate the parameters, throw exception if it fails.
- call service `this.ctx.curl()` to access CNode service, may throw server exception due to network problems.
- an exception also will be thrown after service is getting the response of calling failure from CNode server.

Default error handling is provided but might be inconsistent as the interface convention previously. We need to implement a unified error-handling middleware to handle the errors.

Create a file `error_handler.js` under `app/middleware` directory to create a new [middleware](../basics/middleware.md)

```js
// app/middleware/error_handler.js
module.exports = () => {
  return function* (next) {
    try {
      yield next;
    } catch (err) {
      // All exceptions will trigger an error event on the app and the error log will be recorded
      this.app.emit('error', err, this);

      const status = err.status || 500;
      // error 500 not returning to client when in the production environment because it may contain sensitive information
      const error = status === 500 && this.app.config.env === 'prod'
        ? 'Internal Server Error'
        : err.message;

      // Reading from the properties of error object and set it to the response
      this.body = { error };
      if (status === 422) {
        this.body.detail = err.errors;
      }
      this.status = status;
    }
  };
};
```

We can catch all exceptions and follow the expected format to encapsulate the response through the middleware. It can be loaded into application using configuration file (`config/config.default.js`) 

```js
// config/config.default.js
module.exports = {
  // load the errorHandler middleware
  middleware: [ 'errorHandler' ],
  // only takes effect on URL prefix with '/api'
  errorHandler: {
    match: '/api',
  },
};
```

## Testing

Completing the coding just the first step, furthermore we need to add [Unit Test](../core/unittest.md) to the code.

### controller test

Let's start writing the unit test for the controller. We can simulate the implementation of the service layer in an appropriate way because the most important part is to test the logic as for controller. And mocking up the service layer according the convention of interface, so we can develop layered testing because the service layer itself can also covered by service unit test.

```js
const request = require('supertest');
const mock = require('egg-mock');

describe('test/app/controller/topics.test.js', () => {
  let app;
  before(() => {
    // create an instance quickly using the egg-mock library
    app = mock.app();
    return app.ready();
  });

  afterEach(mock.restore);

  // test the response of passing the error parameters
  it('should POST /api/v2/topics/ 422', function* () {
    app.mockCsrf();
    yield request(app.callback())
    .post('/api/v2/topics')
    .send({
      accesstoken: '123',
    })
    .expect(422)
    .expect({
      error: 'Validation Failed',
      detail: [{ message: 'required', field: 'title', code: 'missing_field' }, { message: 'required', field: 'content', code: 'missing_field' }],
    });
  });

  // mock up the service layer and test the response of normal request
  it('should POST /api/v2/topics/ 201', function* () {
    app.mockCsrf();
    app.mockService('topics', 'create', 123);
    yield request(app.callback())
    .post('/api/v2/topics')
    .send({
      accesstoken: '123',
      title: 'title',
      content: 'hello',
    })
    .expect(201)
    .expect({
      topic_id: 123,
    });
  });
});
```

As the controller testing above, we create an application using [egg-mock](https://github.com/eggjs/egg-mock) and simulate the client to send request through [SuperTest](https://github.com/visionmedia/supertest). In the testing, we also simulate the response from service layer to test the processing logic of controller layer

### service testing

Unit test of service layer may focus on the coding logic. [egg-mock](https://github.com/eggjs/egg-mock) provides a quick method to test the service by calling the test method in the service, and SuperTest to simulate the client request is no longer needed.

```js
const assert = require('assert');
const mock = require('egg-mock');

describe('test/app/service/topics.test.js', () => {
  let app;
  let ctx;
  before(function* () {
    app = mock.app();
    yield app.ready();
    // create a global context object so that can call the service function on a ctx object
    ctx = app.mockContext();
  });

  describe('create()', () => {
    it('should create failed by accesstoken error', function* () {
      try {
        // calling service method on ctx directly
        yield ctx.service.topics.create({
          accesstoken: 'hello',
          title: 'title',
          content: 'content',
        });
      } catch (err) {
        assert(err.status === 401);
        assert(err.message === 'error accessToken');
      }
    });

    it('should create success', function* () {
      // not affect the normal operation of CNode by simulating the interface calling of CNode based on interface convention
      // app.mockHttpclient method can easily simulate the appliation's HTTP request
      app.mockHttpclient(`${ctx.service.topics.root}/topics`, 'POST', {
        data: {
          success: true,
          topic_id: '5433d5e4e737cbe96dcef312',
        },
      });
      const id = yield ctx.service.topics.create({
        accesstoken: 'hello',
        title: 'title',
        content: 'content',
      });
      assert(id === '5433d5e4e737cbe96dcef312');
    });
  });
});
```
In the testing of service layer above,  we create a context object using the `app.createContext()` which provided by egg-mock and call the service method on context object to test directly. It can use `app.mockHttpclient()` to simulate the response of calling HTTP request, which allows us to focus on the logic testing of service layer without the impact of environment. 

------

Details of code implementation and unit test are available in [eggjs/examples/cnode-api](https://github.com/eggjs/examples/tree/master/cnode-api) 