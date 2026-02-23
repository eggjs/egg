---
title: Unit Testing
order: 13
---

# Unit Testing

Unit testing is an important part of application development. Egg provides comprehensive testing support through the `@eggjs/mock` package and [Vitest](https://vitest.dev) as the test runner (via `@eggjs/bin` v8+).

## Quick Start

```ts
import { app } from '@eggjs/mock/bootstrap';
import assert from 'node:assert';

describe('test/app/controller/home.test.ts', () => {
  it('should GET /', async () => {
    const result = await app.httpRequest().get('/').expect(200);

    assert(result.text === 'hi, egg');
  });
});
```

## Testing Tools

- **@eggjs/mock**: Provides mocking utilities for testing
- **vitest**: Test runner with native TypeScript support (used internally by egg-bin)
- **supertest**: HTTP assertion library
- **assert**: Node.js assertion library

## egg-bin Test Features

When running tests via `egg-bin test`, the following are configured automatically:

- **Vitest globals** (`describe`, `it`, `beforeAll`, etc.) are injected — no imports needed in JS files
- **`test/.setup.ts`** (or `.setup.js`) is auto-loaded as a vitest setup file
- **`@eggjs/mock/setup_vitest`** is auto-injected for egg applications, handling app lifecycle (`beforeAll` / `afterEach` / `afterAll`)

For comprehensive unit testing documentation, please see:

- [Core Unit Testing Guide](/core/unittest)
- [Chinese Documentation](/zh-CN/basics/unittest)
