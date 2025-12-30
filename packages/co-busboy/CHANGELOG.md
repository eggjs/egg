# Changelog

## 5.0.0-beta.36

**Initial TypeScript Release**

This is a TypeScript port of [co-busboy](https://github.com/cojs/busboy) with the following improvements:

- Full TypeScript support with comprehensive type definitions
- Modern async/await API (no generator dependencies)
- Replaced `chan` library with native Promise-based queue implementation
- ESM module format
- Compatible with Node.js >= 22.18.0

### Features

- Parse multipart/form-data with async/await
- Support for both Node.js native requests and Koa context objects
- Auto-decompression of gzip/deflate compressed requests
- Field auto-collection with `autoFields` option
- Validation hooks: `checkField` and `checkFile`
- Limit enforcement (413 errors for parts/files/fields limits)

### Breaking Changes from co-busboy 2.x

- Requires Node.js >= 22.18.0
- ESM only (no CommonJS support)
- Generator/yield syntax is no longer supported (use async/await)
