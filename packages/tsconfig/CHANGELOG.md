# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## 3.0.0+

### ⚠ BREAKING CHANGES

* drop Node.js < 22.18.0 support
* only support egg@4

part of https://github.com/eggjs/egg/issues/5434

---

## [3.0.0](https://github.com/eggjs/tsconfig/compare/v2.0.0...v3.0.0) (2025-07-30)


### ⚠ BREAKING CHANGES

* drop Node.js < 22.17.1 support

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

* **Chores**
* Updated Node.js version requirements and CI workflow to support
Node.js 22 and 24.
* Improved test scripts by switching to the native Node.js test runner
and simplifying CI commands.
  * Updated development dependencies and set the package type to module.
* Upgraded TypeScript configuration to target ES2024 and added new
module-related compiler options.
* Refactored test files to use the Node.js test module instead of Mocha.
* Modularized a class decorator by moving it to an external file for
better code organization.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* esm only ([#11](https://github.com/eggjs/tsconfig/issues/11)) ([52c8817](https://github.com/eggjs/tsconfig/commit/52c88179dbb823be37ee7edbd68fb7be0fd18ceb))

## [2.0.0](https://github.com/eggjs/tsconfig/compare/v1.3.3...v2.0.0) (2025-03-11)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **Documentation**
- Extended changelog entries to include details for versions 1.1.0 and
1.0.0.
  - Removed outdated pull request template from documentation.

- **Chores**
- Updated dependency and Node.js requirements for enhanced compatibility
with modern ECMAScript standards.
  - Refined CI workflow configurations and removed obsolete files.
  - Updated licensing details to reflect ongoing contributions.
  - Removed NPM quality badge from the README.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* set default target to ES2022 and moduleResolution to NodeNext ([#10](https://github.com/eggjs/tsconfig/issues/10)) ([bcdd2aa](https://github.com/eggjs/tsconfig/commit/bcdd2aa0e2acd4f1844446d73c21ae5babae79b0))

## [1.3.3](https://github.com/eggjs/tsconfig/compare/v1.3.2...v1.3.3) (2023-04-16)


### Bug Fixes

* remove charset option ([#9](https://github.com/eggjs/tsconfig/issues/9)) ([c013898](https://github.com/eggjs/tsconfig/commit/c01389848ffcdd1655162c8ab79d570eb47454c2))

## [1.3.2](https://github.com/eggjs/tsconfig/compare/v1.3.1...v1.3.2) (2023-02-13)


### Bug Fixes

* disable incremental and reset target to ES2020 ([#8](https://github.com/eggjs/tsconfig/issues/8)) ([e2915d1](https://github.com/eggjs/tsconfig/commit/e2915d1e36ce7f46e85e93a0f02d0c89c24e3437))

## [1.3.1](https://github.com/eggjs/tsconfig/compare/v1.3.0...v1.3.1) (2023-02-13)


### Bug Fixes

* revert target to ES2019 ([#7](https://github.com/eggjs/tsconfig/issues/7)) ([c349fc6](https://github.com/eggjs/tsconfig/commit/c349fc6cc21e81471562187b8acbf296f25d6955))

## [1.3.0](https://github.com/eggjs/tsconfig/compare/v1.2.0...v1.3.0) (2023-02-11)


### Features

* enable emitDecoratorMetadata by default ([#6](https://github.com/eggjs/tsconfig/issues/6)) ([28c8446](https://github.com/eggjs/tsconfig/commit/28c8446678e29ccb7df0c3fd1e2964a05223c6cd))

## [1.2.0](https://github.com/eggjs/tsconfig/compare/v1.1.0...v1.2.0) (2022-12-17)


### Features

* default enable incremental ([#4](https://github.com/eggjs/tsconfig/issues/4)) ([e38424f](https://github.com/eggjs/tsconfig/commit/e38424f141095db94dcb1761cb5c364de98e00ee))
* set compilerOptions target to es2020 ([#5](https://github.com/eggjs/tsconfig/issues/5)) ([dc4ca89](https://github.com/eggjs/tsconfig/commit/dc4ca89153ce8e149f60b0ac2a53bb0ebd6eba37))

---


1.1.0 / 2022-06-20
==================

**others**
  * [[`9722eb2`](http://github.com/eggjs/tsconfig/commit/9722eb25e2f67fa1b87eff226507e241583c418d)] - 📦 NEW: Enable useUnknownInCatchVariables (#2) (fengmk2 <<fengmk2@gmail.com>>)

1.0.0 / 2020-07-30
==================

**others**
  * [[`05c0e95`](http://github.com/eggjs/tsconfig/commit/05c0e954eea00398ed63d6449febbc86051c7fb5)] - first impl (#1) (killa <<killa123@126.com>>),fatal: No names found, cannot describe anything.
