# Changelog

## [4.4.1](https://github.com/eggjs/utils/compare/v4.4.0...v4.4.1) (2025-03-05)


### Bug Fixes

* export getLoader ([#44](https://github.com/eggjs/utils/issues/44)) ([94f7dfe](https://github.com/eggjs/utils/commit/94f7dfe5b600e4ccf2906f7a8f6eaed77c1b1b97))

## [4.4.0](https://github.com/eggjs/utils/compare/v4.3.0...v4.4.0) (2025-03-04)


### Features

* enable ts support by process.env.EGG_TS_ENABLE = true ([#43](https://github.com/eggjs/utils/issues/43)) ([4908ffc](https://github.com/eggjs/utils/commit/4908ffc834add8011ff9b1d91f75e31751975b80))

## [4.3.0](https://github.com/eggjs/utils/compare/v4.2.5...v4.3.0) (2025-02-21)


### Features

* detect typescript enable on env.VITEST === 'true' ([#42](https://github.com/eggjs/utils/issues/42)) ([12af5f9](https://github.com/eggjs/utils/commit/12af5f99918fa090a558bd6e538ff461dfc91a53))

## [4.2.5](https://github.com/eggjs/utils/compare/v4.2.4...v4.2.5) (2025-01-08)


### Bug Fixes

* compatible with old version egg-core package name ([#38](https://github.com/eggjs/utils/issues/38)) ([c8b5dcc](https://github.com/eggjs/utils/commit/c8b5dcc28a2168da742f40439ef53a15723acb68))

## [4.2.4](https://github.com/eggjs/utils/compare/v4.2.3...v4.2.4) (2025-01-03)


### Bug Fixes

* export isSupportTypeScript ([#37](https://github.com/eggjs/utils/issues/37)) ([80d8eb1](https://github.com/eggjs/utils/commit/80d8eb1c398a158438fa4705ef7a75ddf0ad05d6))

## [4.2.3](https://github.com/eggjs/utils/compare/v4.2.2...v4.2.3) (2025-01-03)


### Bug Fixes

* support resolve from scoped package parent node_modules ([#36](https://github.com/eggjs/utils/issues/36)) ([7c9cc42](https://github.com/eggjs/utils/commit/7c9cc42b0398ea961eae2a2bfe12829317e1714d))

## [4.2.2](https://github.com/eggjs/utils/compare/v4.2.1...v4.2.2) (2024-12-30)


### Bug Fixes

* import resolve find in paths's node_modules ([#35](https://github.com/eggjs/utils/issues/35)) ([bd772af](https://github.com/eggjs/utils/commit/bd772afbf585283a8ecef1ea6cfcba668a98c511))

## [4.2.1](https://github.com/eggjs/utils/compare/v4.2.0...v4.2.1) (2024-12-30)


### Bug Fixes

* import resolve support relative path ([#34](https://github.com/eggjs/utils/issues/34)) ([42afd2a](https://github.com/eggjs/utils/commit/42afd2a37367515c0f6ade4bf8cef6132632f755))

## [4.2.0](https://github.com/eggjs/utils/compare/v4.1.6...v4.2.0) (2024-12-29)


### Features

* detect the type of egg project ([#33](https://github.com/eggjs/utils/issues/33)) ([68950de](https://github.com/eggjs/utils/commit/68950deec7e0f97be7cf8509a025ef218799e6cf))

## [4.1.6](https://github.com/eggjs/utils/compare/v4.1.5...v4.1.6) (2024-12-28)


### Bug Fixes

* try to use index.* when package.json not exists ([#32](https://github.com/eggjs/utils/issues/32)) ([b4b2e0c](https://github.com/eggjs/utils/commit/b4b2e0c47abf8367680753d5243cb7df41259e66))

## [4.1.5](https://github.com/eggjs/utils/compare/v4.1.4...v4.1.5) (2024-12-27)


### Bug Fixes

* use importResolve to get framework path ([#31](https://github.com/eggjs/utils/issues/31)) ([7caad4d](https://github.com/eggjs/utils/commit/7caad4dfb19fba1f1f3d18892b1e44d696699fb6))

## [4.1.4](https://github.com/eggjs/utils/compare/v4.1.3...v4.1.4) (2024-12-25)


### Bug Fixes

* try resolve by file no matter dir exists or not ([#30](https://github.com/eggjs/utils/issues/30)) ([4605e3a](https://github.com/eggjs/utils/commit/4605e3a1805ffc7ac87d0a6fb1264f83f05e6539))

## [4.1.3](https://github.com/eggjs/utils/compare/v4.1.2...v4.1.3) (2024-12-24)


### Bug Fixes

* debug dont print full import object ([#29](https://github.com/eggjs/utils/issues/29)) ([daa5edf](https://github.com/eggjs/utils/commit/daa5edf248331e9fdfe309d3bb2bba150fdf3f3b))

## [4.1.2](https://github.com/eggjs/utils/compare/v4.1.1...v4.1.2) (2024-12-24)


### Bug Fixes

* should try to use esm module first ([#28](https://github.com/eggjs/utils/issues/28)) ([88b08cf](https://github.com/eggjs/utils/commit/88b08cff7da0a883fbda8d627acef538f61ba2ef))

## [4.1.1](https://github.com/eggjs/utils/compare/v4.1.0...v4.1.1) (2024-12-24)


### Bug Fixes

* try to read build dist file first ([#27](https://github.com/eggjs/utils/issues/27)) ([7a89153](https://github.com/eggjs/utils/commit/7a89153f70a0536674287022ac4db71a626361c4))

## [4.1.0](https://github.com/eggjs/utils/compare/v4.0.3...v4.1.0) (2024-12-23)


### Features

* support import typescript files first at dev env ([#26](https://github.com/eggjs/utils/issues/26)) ([349c0c3](https://github.com/eggjs/utils/commit/349c0c3886cae59d1dcaa6634764aee406c07837))

## [4.0.3](https://github.com/eggjs/egg-utils/compare/v4.0.2...v4.0.3) (2024-12-17)


### Bug Fixes

* set default require.resolve paths to cwd ([#25](https://github.com/eggjs/egg-utils/issues/25)) ([84e16ed](https://github.com/eggjs/egg-utils/commit/84e16ededd0eca1a5a3412aa8934cd0cd4e02567))

## [4.0.2](https://github.com/eggjs/egg-utils/compare/v4.0.1...v4.0.2) (2024-06-17)


### Bug Fixes

* support ts-module ([#23](https://github.com/eggjs/egg-utils/issues/23)) ([c032932](https://github.com/eggjs/egg-utils/commit/c0329323489724b59a79c9715fa793d0c90a3b88))

## [4.0.1](https://github.com/eggjs/egg-utils/compare/v4.0.0...v4.0.1) (2024-06-17)


### Bug Fixes

* support export default null ([#22](https://github.com/eggjs/egg-utils/issues/22)) ([61a8a98](https://github.com/eggjs/egg-utils/commit/61a8a9857df89dc6c79c4e1011f89a408f88d99f))

## [4.0.0](https://github.com/eggjs/egg-utils/compare/v3.0.1...v4.0.0) (2024-06-17)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced new utility functions for resolving and importing modules
with support for CommonJS and ESM formats.
- Added new test fixtures for CommonJS and ESM modules to validate
module import functionality.

- **Refactor**
- Updated import statements to include file extensions (`.js`) for
consistency and compatibility.
	- Refactored code to use async/await for asynchronous operations.
	- Improved path handling in tests with helper functions.

- **Documentation**
- Updated `package.json` with new scripts, dependencies, and module
management configurations.

- **Chores**
- Enhanced `.gitignore` to exclude `.tshy*` files and `dist/` directory.
	- Modified GitHub Actions workflows for Node.js and release processes.

- **Tests**
	- Added tests for new module import functions.
	- Updated existing tests to reflect new import paths and async changes.

- **Configuration**
- Updated `tsconfig.json` for stricter TypeScript settings and modern
module resolution.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support @eggjs/core next version ([#21](https://github.com/eggjs/egg-utils/issues/21)) ([a37968c](https://github.com/eggjs/egg-utils/commit/a37968cc9aceb770da1410480f792df16989a36a))

## [3.0.1](https://github.com/eggjs/egg-utils/compare/v3.0.0...v3.0.1) (2024-01-12)


### Bug Fixes

* scope package resolve logic in monorepo ([#20](https://github.com/eggjs/egg-utils/issues/20)) ([f4a47b9](https://github.com/eggjs/egg-utils/commit/f4a47b908120049094b7689ec51c8c6de1066f96))

## [3.0.0](https://github.com/eggjs/egg-utils/compare/v2.5.0...v3.0.0) (2023-05-29)


### ⚠ BREAKING CHANGES

* drop Node.js 14 support

closes https://github.com/eggjs/egg-utils/issues/18

### Features

* refactor with typescript ([#19](https://github.com/eggjs/egg-utils/issues/19)) ([7f6dcf5](https://github.com/eggjs/egg-utils/commit/7f6dcf5a58f6b3d7801082fb9f8c363e19763b55))

## [2.5.0](https://github.com/eggjs/egg-utils/compare/v2.4.1...v2.5.0) (2023-04-26)


### Features

* getFrameworkPath support monorepo ([#16](https://github.com/eggjs/egg-utils/issues/16)) ([47ffc89](https://github.com/eggjs/egg-utils/commit/47ffc89fa01636e30761068539296e4786093ab1))


---

2.4.1 / 2018-08-07
==================

**fixes**
  * [[`413d47b`](http://github.com/eggjs/egg-utils/commit/413d47b23281e226a6bd6da76d78047214f8b64d)] - fix: not loading plugins config while getting configs (#12) (Khaidi Chu <<i@2333.moe>>)

2.4.0 / 2018-04-15
==================

**features**
  * [[`737c851`](http://github.com/eggjs/egg-utils/commit/737c851272f1d50a103158d52359b536bc33f893)] - feat: env options for all utils (#10) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`99877f4`](http://github.com/eggjs/egg-utils/commit/99877f49941bb41cff49f692e75382bdb651cb07)] - feat: add getConfig (#9) (Kaicong Huang <<526672351@qq.com>>)

**others**
  * [[`6c37dd2`](http://github.com/eggjs/egg-utils/commit/6c37dd22ed653dfb21df218a270e0b83d3825e75)] - docs: fix readme (#11) (Haoliang Gao <<sakura9515@gmail.com>>)

2.3.0 / 2017-10-26
==================

**others**
  * [[`42e4394`](http://github.com/eggjs/egg-utils/commit/42e43949997a98c1caacddced05ad8f307cbe1ca)] - refactor: use readJSON instead of require (#8) (Haoliang Gao <<sakura9515@gmail.com>>)

2.2.0 / 2017-06-02
==================

  * feat: check baseDir and framework (#7)
  * feat: add getPlugins and getLoadUnits (#6)

2.1.0 / 2017-03-02
==================

  * feat: lookup framework from process.cwd() (#4)

2.0.0 / 2017-03-01
==================

  * feat: move getFrameworkPath from egg-cluster (#2)
  * deps: only support node >= 6.0.0

1.1.0 / 2017-01-13
==================

  * feat: support read framework from package.json (#1)

1.0.0 / 2016-06-20
==================

  * init version
