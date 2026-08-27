---
title: Koa Override Package
type: package
summary: Method-override middleware used by Egg's default middleware stack.
source_files:
  - packages/koa-override/src/index.ts
  - packages/koa-override/test/index.test.ts
  - packages/koa-override/package.json
  - packages/koa-override/tsconfig.json
  - packages/koa-override/tsdown.config.ts
  - packages/koa-override/vitest.config.ts
  - packages/egg/package.json
  - packages/egg/src/app/middleware/override_method.ts
updated_at: 2026-08-28
status: active
---

# Koa Override Package

`@eggjs/koa-override` provides the method-override middleware used by Egg's
default `overrideMethod` middleware. It accepts `_method` from a parsed request
body before checking the `X-HTTP-Method-Override` header, validates the target
against Node.js HTTP methods, and only processes overrides for `POST` requests
by default. Non-`POST` requests pass through unchanged unless callers configure
additional allowed methods.

The package lives in the Egg monorepo so its TypeScript declarations, runtime
requirements, tests, and releases follow the Egg 4 toolchain. Egg consumes it
through a `workspace:*` dependency.
