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

## [4.0.0](https://github.com/eggjs/multipart/compare/v3.5.0...v4.0.0) (2025-02-03)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
  - Introduced a new middleware for handling multipart requests.
  - Added improved error handling for oversized file uploads.

- **Refactor**
- Streamlined configuration and context enhancements for better
stability and TypeScript support.
- Modernized the codebase by transitioning to ES modules and updating
type definitions.

- **Chores**
- Updated package metadata, dependencies, and continuous integration
settings to support newer Node.js versions.
- Introduced a new TypeScript configuration for stricter type-checking.

- **Tests**
- Added unit tests to validate application behavior under incorrect
configurations.
- Established comprehensive tests for multipart form handling to ensure
correct processing of file uploads.
- Transitioned existing tests to TypeScript and updated assertions for
consistency.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#67](https://github.com/eggjs/multipart/issues/67)) ([ccefb3e](https://github.com/eggjs/multipart/commit/ccefb3ebe89e5a061adb7d8235bd8670a57d7411))

## [3.5.0](https://github.com/eggjs/egg-multipart/compare/v3.4.0...v3.5.0) (2025-01-22)


### Features

* support custom pathToRegexpModule ([#66](https://github.com/eggjs/egg-multipart/issues/66)) ([d474eec](https://github.com/eggjs/egg-multipart/commit/d474eecf1f86115bfb9750f1856a4d87ec542109))

## [3.4.0](https://github.com/eggjs/egg-multipart/compare/v3.3.0...v3.4.0) (2024-06-07)


### Features

* remove unuse "stream-wormhole" deps ([#63](https://github.com/eggjs/egg-multipart/issues/63)) ([f61d60f](https://github.com/eggjs/egg-multipart/commit/f61d60fba2c9290542acabe9f7dca0f201635e61))

## [3.3.0](https://github.com/eggjs/egg-multipart/compare/v3.2.0...v3.3.0) (2022-12-18)


### Features

* drop uuid dependency ([#62](https://github.com/eggjs/egg-multipart/issues/62)) ([b8bb895](https://github.com/eggjs/egg-multipart/commit/b8bb895acec33f4b1476ad35a06718529d6ad067))

---


3.2.0 / 2022-09-29
==================

**features**
  * [[`b007d99`](http://github.com/eggjs/egg-multipart/commit/b007d9938939e93732cdee168987c02cf6458e86)] - feat: use PassThrough instead of Writable (#60) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`ca9efc1`](http://github.com/eggjs/egg-multipart/commit/ca9efc1d3faeb332b48de8320a6b9df31936bb42)] - feat: support `for await...of` (#57) (TZ | 天猪 <<atian25@qq.com>>)

**others**
  * [[`e9bba31`](http://github.com/eggjs/egg-multipart/commit/e9bba31d051cd14d0ad02c3d5297991f82d6fa1c)] - refactor: saveRequestFiles with for-await-for (#58) (TZ | 天猪 <<atian25@qq.com>>)

3.1.0 / 2022-09-27
==================

**others**
  * [[`399c6cb`](http://github.com/eggjs/egg-multipart/commit/399c6cb8c685337c3a9bcab00191e8e4a018f25f)] - 🐛 feat: refactor multipart options normalize && fix defParamCharset default to utf8 (#56) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`69ba7c0`](http://github.com/eggjs/egg-multipart/commit/69ba7c0c91321866f4f3cdab06d66081cae3796a)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)
  * [[`cc93417`](http://github.com/eggjs/egg-multipart/commit/cc93417af059788ff54d6af56816991e1e0d8b6a)] - test: fix ci (#55) (TZ | 天猪 <<atian25@qq.com>>)

3.0.0 / 2022-09-21
==================

**others**
  * [[`a488127`](http://github.com/eggjs/egg-multipart/commit/a488127dc399eda2542a39b268f04f78569a3be1)] - refactor: [BREAKING_CHANGE] update deps co-busbox && node>=14.x (#54) (TZ | 天猪 <<atian25@qq.com>>)

2.13.1 / 2021-07-21
==================

**fixes**
  * [[`20e765e`](http://github.com/eggjs/egg-multipart/commit/20e765ee2b121bbd1b3ba8853397990a67f7b76b)] - fix: add autoFields dts (#53) (恒遥 <<zhangyao318@gmail.com>>)

2.13.0 / 2021-07-05
==================

**others**
  * [[`013ba19`](http://github.com/eggjs/egg-multipart/commit/013ba1939e5eeefa605e3b444d45d2513f90a875)] - deps: upgrade globby to the latest version for install warning (sky <<hubcarl@126.com>>)
  * [[`7e07b3b`](http://github.com/eggjs/egg-multipart/commit/7e07b3b7ec586b95f6ada9ac11ae5a778b2e73e3)] - chore: remove badges (fengmk2 <<fengmk2@gmail.com>>)
  * [[`3fdc940`](http://github.com/eggjs/egg-multipart/commit/3fdc94025713f92e2be6d7e628b834d4bb8fbe5a)] - test: add limit fileSize per-request test cases (#51) (fengmk2 <<fengmk2@gmail.com>>)

2.12.0 / 2021-05-22
==================

**features**
  * [[`ebd22fb`](http://github.com/eggjs/egg-multipart/commit/ebd22fb62e16f6bc6b785d28a5e19bb3e7915170)] - feat: deleting the temporary directory is optional (#48) (cd-xulei <<chengduxulei@foxmail.com>>)

2.11.1 / 2021-05-18
==================

**fixes**
  * [[`73ea7f2`](http://github.com/eggjs/egg-multipart/commit/73ea7f205408b99146fa784b851001314119413b)] - fix: fix array filed value (#50) (killa <<killa123@126.com>>)

2.11.0 / 2021-05-17
==================

**features**
  * [[`a73c8e6`](http://github.com/eggjs/egg-multipart/commit/a73c8e66a03babac76e924cc23b14aa114e08ea2)] - feat: allow array fileds in file mode (#49) (killa <<killa123@126.com>>)

2.10.3 / 2020-05-06
==================

**fixes**
  * [[`718df0e`](http://github.com/eggjs/egg-multipart/commit/718df0e85455746e6126c6de8180b427e798d217)] - fix: incorrect file size limit (#44) (hyj1991 <<yeekwanvong@gmail.com>>)

2.10.2 / 2020-03-30
==================

**fixes**
  * [[`ce33219`](http://github.com/eggjs/egg-multipart/commit/ce33219f008e390a7321a8dfb52e887ca2d6aa71)] - fix: definition of config.whitelist (#43) (cjf <<cjfff1996@gmail.com>>)

**others**
  * [[`94c1135`](http://github.com/eggjs/egg-multipart/commit/94c1135f49dfbcea3a39d59b1b5e2b0a351d217a)] - docs: fix error handler example (#42) (zeroslope <<10218146+zeroslope@users.noreply.github.com>>)

2.10.1 / 2019-12-16
==================

**fixes**
  * [[`3451864`](http://github.com/eggjs/egg-multipart/commit/34518642562b8712040220090ee5828583a2fdcf)] - fix: support extname not speicified (#40) (刘涛 <<liutaofe@gmail.com>>)

2.10.0 / 2019-12-11
==================

**features**
  * [[`21ded55`](http://github.com/eggjs/egg-multipart/commit/21ded553420c383bf854a7e3374b0c5bb8c18581)] - feat: compatibility without dot at fileExtensions (#39) (TZ | 天猪 <<atian25@qq.com>>)

2.9.1 / 2019-11-07
==================

**fixes**
  * [[`27464f3`](http://github.com/eggjs/egg-multipart/commit/27464f3b954b31005f042084a95cbfbac5dcf9a4)] - fix: add more error message (#38) (TZ | 天猪 <<atian25@qq.com>>)

2.9.0 / 2019-08-09
==================

**features**
  * [[`a1fcdab`](http://github.com/eggjs/egg-multipart/commit/a1fcdab00ef1113845bbe41a4c0b40ce9356cc94)] - feat: fileModeMatch support glob with egg-path-matching (#36) (TZ | 天猪 <<atian25@qq.com>>)

2.8.0 / 2019-08-03
==================

**features**
  * [[`5d3ee0f`](http://github.com/eggjs/egg-multipart/commit/5d3ee0f1b82ba705f8bac0468cb19ab6f1dce8ab)] - feat: saveRequestFiles support options (#37) (仙森 <<dapixp@gmail.com>>)

2.7.1 / 2019-05-22
==================

**fixes**
  * [[`75b1d48`](http://github.com/eggjs/egg-multipart/commit/75b1d48079b3c6b1358bf75197af0c8164ac926a)] - fix: whitelist declaration(#35) (Stephen <<stephenseraph@gmail.com>>)

2.7.0 / 2019-05-20
==================

**features**
  * [[`0d26aa0`](http://github.com/eggjs/egg-multipart/commit/0d26aa0862279eac15cf72281a90ccf77731e3d6)] - feat: export saveRequestFiles to context (#34) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`c5ca3ea`](http://github.com/eggjs/egg-multipart/commit/c5ca3ea2a46708744bb884f67fafee9bc1606df1)] - chore: remove tmp files and don't block the request's response (#33) (fengmk2 <<fengmk2@gmail.com>>)

2.6.2 / 2019-05-19
==================

**fixes**
  * [[`72b03aa`](http://github.com/eggjs/egg-multipart/commit/72b03aae2ef18bef7f8d0a71c323f072c567f8d5)] - fix: keep same metas as file stream on file mode (#32) (fengmk2 <<fengmk2@gmail.com>>)

2.6.1 / 2019-05-16
==================

**others**
  * [[`c5c4308`](http://github.com/eggjs/egg-multipart/commit/c5c43080df4c203c23053398390cfee25dc60542)] - chore: add typings and jsdocs (#31) (TZ | 天猪 <<atian25@qq.com>>)

2.6.0 / 2019-05-16
==================

**features**
  * [[`7eb534f`](http://github.com/eggjs/egg-multipart/commit/7eb534f3b2cdb44fda025cf831877b8be7e84b55)] - feat: support file mode on default stream mode (#30) (fengmk2 <<fengmk2@gmail.com>>)

2.5.0 / 2019-05-01
==================

**features**
  * [[`33c6b52`](http://github.com/eggjs/egg-multipart/commit/33c6b52fcd7cc4674cc2ff51dfe849adf078ad5c)] - feat(types): typescript support (#28) (George <<main.lukai@gmail.com>>)

**others**
  * [[`6be344f`](http://github.com/eggjs/egg-multipart/commit/6be344fd7cdaa04c8e0861f5295244c8a85d14e8)] - test: fix schedule task test case (#29) (George <<main.lukai@gmail.com>>)

2.4.0 / 2018-12-26
==================

**features**
  * [[`d7504b9`](http://github.com/eggjs/egg-multipart/commit/d7504b9635c68184181c751212c30a6eb53f87fe)] - feat: custom multipart parse options per request (#27) (fengmk2 <<fengmk2@gmail.com>>)

2.3.0 / 2018-11-11
==================

**features**
  * [[`8d63cea`](http://github.com/eggjs/egg-multipart/commit/8d63cea48134d4d2a69796a399f04117222efd70)] - feat: export ctx.cleanupRequestFiles to improve cleanup more easy (#22) (fengmk2 <<fengmk2@gmail.com>>)

2.2.1 / 2018-09-29
==================

  * chore: fix egg docs build (#21)
  * chore: add azure pipelines badge

2.2.0 / 2018-09-29
==================

**features**
  * [[`75c0733`](http://github.com/eggjs/egg-multipart/commit/75c0733bcbb68349970b5d2bb189bf8822954337)] - feat: Provide `file` mode to handle multipart request (#19) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`0b4e118`](http://github.com/eggjs/egg-multipart/commit/0b4e118a8eef3e61262fb981999cc2173dc08cc3)] - chore: no need to consume stream on error throw (#18) (fengmk2 <<fengmk2@gmail.com>>)

2.1.0 / 2018-08-07
==================

**features**
  * [[`5ece18a`](http://github.com/eggjs/egg-multipart/commit/5ece18abd0a1026fa742e15a7480010619156051)] - feat: getFileStream() can accept non file request (#17) (fengmk2 <<fengmk2@gmail.com>>)

2.0.0 / 2017-11-10
==================

**others**
  * [[`6a7fa06`](http://github.com/eggjs/egg-multipart/commit/6a7fa06d8978d061950d339cdd685b1ace6995c3)] - refactor: use async function and support egg@2 (#15) (Yiyu He <<dead_horse@qq.com>>)

1.5.1 / 2017-10-27
==================

**fixes**
  * [[`a7778e5`](http://github.com/eggjs/egg-multipart/commit/a7778e58f603c5efe298c8a651356d203afefed0)] - fix: fileSize typo (#10) (tangyao <<2001-wms@163.com>>)

**others**
  * [[`f95e322`](http://github.com/eggjs/egg-multipart/commit/f95e32287570f8f79de3061abfdfcbc93823f44f)] - docs: add more example (#14) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`b0785e3`](http://github.com/eggjs/egg-multipart/commit/b0785e34bb68b18af0d9f50bc3bf40cb91987391)] - docs: s/extention/extension (#13) (Sen Yang <<jasonslyvia@users.noreply.github.com>>)
  * [[`d67fcf5`](http://github.com/eggjs/egg-multipart/commit/d67fcf5b64d0252345e04325c170e14786bc55a4)] - test: improve code coverage (#12) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`c8b77df`](http://github.com/eggjs/egg-multipart/commit/c8b77dfa9ad44dace89ef62531f182a4960843f6)] - test: fix failing test (#11) (Haoliang Gao <<sakura9515@gmail.com>>)

1.5.0 / 2017-06-09
==================

  * refactor: always log when exceed limt (#9)

1.4.0 / 2017-05-18
==================

  * feat: Add upper case extname support (#7)

1.3.0 / 2017-04-21
==================

  * feat: whitelist support fn && english readme (#6)

1.2.0 / 2017-03-18
==================

  * feat: should emit stream error event when file too large (#5)
  * deps: upgrade all dev deps (#4)

1.1.0 / 2017-02-08
==================

  * feat: getFileStream return promise (#3)

1.0.0 / 2016-08-02
==================

 * init version
