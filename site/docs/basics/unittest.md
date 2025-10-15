---
title: Unit Testing
order: 13
---

# Unit Testing

> ⚠️ **Translation in Progress**: This page is being translated. For complete documentation, please refer to the [Chinese version](/zh-CN/basics/unittest) or the [Core Unit Testing guide](/core/unittest).

Unit testing is an important part of application development. Egg provides comprehensive testing support through the `@eggjs/mock` package.

## Quick Start

```js
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('test/app/controller/home.test.js', () => {
  it('should GET /', async () => {
    const result = await app.httpRequest().get('/').expect(200);

    assert(result.text === 'hi, egg');
  });
});
```

## Testing Tools

- **@eggjs/mock**: Provides mocking utilities for testing
- **supertest**: HTTP assertion library
- **assert**: Node.js assertion library

For comprehensive unit testing documentation, please see:

- [Core Unit Testing Guide](/core/unittest)
- [Chinese Documentation](/zh-CN/basics/unittest)
