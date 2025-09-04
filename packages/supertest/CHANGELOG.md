# Changelog

## [8.2.0](https://github.com/eggjs/supertest/compare/v8.1.1...v8.2.0) (2025-01-17)


### Features

* support trace method request ([#4](https://github.com/eggjs/supertest/issues/4)) ([1e3d92b](https://github.com/eggjs/supertest/commit/1e3d92bc194b2391e4be9bb0a38ed263255e8f46))

## [8.1.1](https://github.com/eggjs/supertest/compare/v8.1.0...v8.1.1) (2024-12-22)


### Bug Fixes

* add @types/superagent to dependencies ([#3](https://github.com/eggjs/supertest/issues/3)) ([ec0a012](https://github.com/eggjs/supertest/commit/ec0a012345f397258ceb6ed72df0887b34ad9566))

## [8.1.0](https://github.com/eggjs/supertest/compare/v8.0.0...v8.1.0) (2024-12-21)


### Features

* expect header exists or not ([#2](https://github.com/eggjs/supertest/issues/2)) ([e5060b0](https://github.com/eggjs/supertest/commit/e5060b05c7d35830f9baa2e59324bf5ce446db27))

## [8.0.0](https://github.com/eggjs/supertest/compare/v7.0.0...v8.0.0) (2024-12-21)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced a new `TestAgent` class for enhanced HTTP and HTTP/2
requests.
	- Added a new `Request` class to facilitate server requests.
	- Implemented a new `AssertError` class for improved error handling.
	- Created new GitHub Actions workflows for CI and package publishing.

- **Documentation**
- Updated the `README.md` to reflect rebranding to `@eggjs/supertest`
and revised installation instructions.

- **Bug Fixes**
	- Enhanced error handling and type safety in tests.

- **Chores**
	- Removed outdated configuration files and unnecessary dependencies.
	- Updated TypeScript configuration for stricter type checking.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#1](https://github.com/eggjs/supertest/issues/1)) ([09fb755](https://github.com/eggjs/supertest/commit/09fb7555aecebc2047cd68efafe0f54dc17b6108))
