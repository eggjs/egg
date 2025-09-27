# Changelog

>[!IMPORTANT]
>Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## 5.0.0+

### ⚠ BREAKING CHANGES

* drop Node.js < 22.18.0 support
* only support egg@4

part of https://github.com/eggjs/egg/issues/5434

---

## [4.0.0](https://github.com/eggjs/development/compare/v3.0.2...v4.0.0) (2025-01-11)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

Based on the comprehensive changes, here are the release notes:

## Release Notes for @eggjs/development

- **New Features**
	- Added TypeScript support for development environment
	- Enhanced file watching and reloading mechanisms
	- Improved configuration options for development mode

- **Breaking Changes**
	- Migrated from `egg-development` to `@eggjs/development`
	- Requires Node.js version >=18.19.0
	- Dropped support for Node.js 14 and 16

- **Improvements**
	- Refined ESLint configuration
	- Updated GitHub Actions workflow to focus on macOS testing
	- Added more robust file change detection
	- Enhanced type safety across the project

- **Bug Fixes**
	- Improved handling of file reloading in different scenarios
	- Fixed potential issues with asset and service file monitoring

- **Chores**
	- Updated dependencies
	- Migrated test suite to TypeScript
	- Restructured project configuration

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#34](https://github.com/eggjs/development/issues/34)) ([7a63cd6](https://github.com/eggjs/development/commit/7a63cd62be6b5ba1c3792bc983b42a1d0da42326))

## [3.0.2](https://github.com/eggjs/egg-development/compare/v3.0.1...v3.0.2) (2024-12-22)


### Bug Fixes

* check run dir exists before read it ([#33](https://github.com/eggjs/egg-development/issues/33)) ([d95db72](https://github.com/eggjs/egg-development/commit/d95db72ecb2b24c4cce33654fa533f4901dc3896))

## [3.0.1](https://github.com/eggjs/egg-development/compare/v3.0.0...v3.0.1) (2024-12-22)


### Bug Fixes

* skip read run dir when it not exists ([#32](https://github.com/eggjs/egg-development/issues/32)) ([2d24ce3](https://github.com/eggjs/egg-development/commit/2d24ce320eaf1c36601f9703f8d2a4635b636167))

## [3.0.0](https://github.com/eggjs/egg-development/compare/v2.7.0...v3.0.0) (2024-05-08)


### ⚠ BREAKING CHANGES

* drop Node.js < 14 support


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
  - Introduced a new GitHub Actions workflow for Node.js releases.
- **Enhancements**
- Updated continuous integration workflow with improved job
configurations.
- Enhanced file system operations across multiple JavaScript files using
Node.js built-in modules.
- **Bug Fixes**
- Fixed directory and file operations in test suites to use updated
Node.js methods.
- **Documentation**
  - Adjusted documentation comments and removed outdated directives.
- **Refactor**
- Removed the use of `'use strict';` in several JavaScript files to
align with modern standards.
- **Dependencies**
- Updated various dependencies and Node version requirements to ensure
compatibility and security.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* upgrade deps ([#31](https://github.com/eggjs/egg-development/issues/31)) ([af27674](https://github.com/eggjs/egg-development/commit/af27674a60b0407179db65499cf2b4b55662b06b))

---


2.7.0 / 2020-09-01
==================

**features**
  * [[`45a653c`](http://github.com/eggjs/egg-development/commit/45a653c32188eb82d3532ce4cc833094a228c85a)] - feat: overrideIgnore (#30) (TZ | 天猪 <<atian25@qq.com>>)

2.6.0 / 2020-08-19
==================

**features**
  * [[`2750b52`](http://github.com/eggjs/egg-development/commit/2750b525bba30d88e94bf622f22cfc4389cdcda5)] - feat: ignore app/web by default (#29) (TZ | 天猪 <<atian25@qq.com>>)

2.5.0 / 2020-05-25
==================

**features**
  * [[`eaa9222`](http://github.com/eggjs/egg-development/commit/eaa922279c2c3bf55ffd7f394dedd09aa7ef2480)] - feat: support absolute path (#27) (TZ | 天猪 <<atian25@qq.com>>)

**fixes**
  * [[`b661cad`](http://github.com/eggjs/egg-development/commit/b661cad0251bb580c04ad2b8e7f35b20c765820b)] - fix: incorrect debounce on windows (#28) (hyj1991 <<yeekwanvong@gmail.com>>)

**others**
  * [[`3652692`](http://github.com/eggjs/egg-development/commit/3652692dfa929040b3e35f05a7b03ae19b2e476b)] - chore: update travis (#25) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`e5b4aa8`](http://github.com/eggjs/egg-development/commit/e5b4aa88fb1db901ca550fd1db95afd94c596a63)] - docs: update doc (#24) (Miaolegemie <<1942037006@qq.com>>)

2.4.3 / 2019-05-07
==================

**fixes**
  * [[`8c716f1`](http://github.com/eggjs/egg-development/commit/8c716f1bca5a44478229abf5ff2c47bc6fb3822f)] - fix: missing lib folder in npm package (#23) (Khaidi Chu <<i@2333.moe>>)

2.4.2 / 2019-02-04
==================

**fixes**
  * [[`1ea1c61`](http://github.com/eggjs/egg-development/commit/1ea1c618616e165da771c1bb4ff87f2abd0635b8)] - fix: don't reload in single process mode (#22) (Yiyu He <<dead_horse@qq.com>>)

2.4.1 / 2018-08-02
==================

**fixes**
  * [[`88f2967`](http://github.com/eggjs/egg-development/commit/88f2967207a43ba6a7e79a3426d3d1eae78fa292)] - fix: load router by middleware (#20) (Yiyu He <<dead_horse@qq.com>>)

2.4.0 / 2018-07-31
==================

  * feat: app to watch list (#19)

2.3.1 / 2018-06-20
==================

**others**
  * [[`f87bee2`](http://github.com/eggjs/egg-development/commit/f87bee2171f29b042e88503896c8e8de11be6167)] - chore: missing lib directory in pkg.files (#18) (Haoliang Gao <<sakura9515@gmail.com>>)

2.3.0 / 2018-06-20
==================

**features**
  * [[`3b6c138`](http://github.com/eggjs/egg-development/commit/3b6c1387712b68f7e0eb9833f7c486e37d77f8fd)] - feat: pick show loader timing (#17) (Haoliang Gao <<sakura9515@gmail.com>>)

2.2.0 / 2018-02-06
==================

**features**
  * [[`307dc9c`](http://github.com/eggjs/egg-development/commit/307dc9c2659adea5fa6e9bcb65e8db178f8de366)] - feat: support custom `config.development.reloadPattern ` (#14) (TZ | 天猪 <<atian25@qq.com>>)

2.1.0 / 2017-12-13
==================

**features**
  * [[`252929f`](http://github.com/eggjs/egg-development/commit/252929f980d055e1cec05811981e204d0d81cb23)] - feat: support override watchDirs (#13) (TZ | 天猪 <<atian25@qq.com>>)

2.0.0 / 2017-11-09
==================

**others**
  * [[`4416724`](http://github.com/eggjs/egg-development/commit/44167241fdb7cd11a5c68b4de5e728aa8992dcf8)] - refactor: drop <8.x, support egg2. [BREAKING CHANGE] (#12) (TZ | 天猪 <<atian25@qq.com>>)

1.3.2 / 2017-11-01
==================

  * fix: fastReady default to false (#11)

1.3.1 / 2017-06-04
==================

  * docs: fix License url (#10)
  * chore: remove .vscode (#9)

1.3.0 / 2017-04-18
==================

  * feat: allow reload on debug (#8)
  * docs: adjust badge link (#6)

1.2.0 / 2017-01-24
==================

  * feat: remove log runtime (#5)

1.1.0 / 2017-01-03
==================

  * feat: can disable fast ready (#4)

1.0.2 / 2016-09-20
==================

  * refactor: !isFile -> isDirectory (#3)

1.0.1 / 2016-09-20
==================

  * fix: reload at remove file (#2)

1.0.0 / 2016-09-13
==================
  * feat: release 1.0.0 

0.1.0 / 2016-09-13
==================
  * feat: debounce reload && docs (#1)
