# Changelog

## [3.1.1](https://github.com/eggjs/egg-ts-helper/compare/v3.1.0...v3.1.1) (2025-03-05)


### Bug Fixes

* make sure parent dir exists ([2a63587](https://github.com/eggjs/egg-ts-helper/commit/2a63587a59000a3a7eebf271e448694514a6cd39))

## [3.1.0](https://github.com/eggjs/egg-ts-helper/compare/v3.0.0...v3.1.0) (2025-03-05)


### Features

* support gen ts defines on esm project ([#115](https://github.com/eggjs/egg-ts-helper/issues/115)) ([5c25621](https://github.com/eggjs/egg-ts-helper/commit/5c256219b684922b026dbe25b2840feb9b09c22d))

## [3.0.0](https://github.com/eggjs/egg-ts-helper/compare/v2.1.1...v3.0.0) (2025-02-04)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

Only support egg >= 4.0.0

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **Documentation**
- Introduced a new “Contributors” section in the project documentation
to highlight community involvement.
- **Chores**
- Streamlined CI workflows by removing legacy configurations and
updating triggers for improved efficiency.
- Upgraded key dependencies and increased the minimum required Node.js
version for enhanced performance and security.
- **Refactor**
- Standardized module import practices across the codebase to align with
current Node.js conventions.
	- Improved asynchronous handling in core operations.
- **Tests**
- Updated test setups and assertions to reflect the new module import
standards and dependency changes.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support egg v4 ([#114](https://github.com/eggjs/egg-ts-helper/issues/114)) ([90491cf](https://github.com/eggjs/egg-ts-helper/commit/90491cf758e6a36d006b06caf0bac91065c17afb))

## [2.1.1](https://github.com/eggjs/egg-ts-helper/compare/v2.1.0...v2.1.1) (2025-02-04)


### Bug Fixes

* load the tsconfig extends with the specific extension name ([#111](https://github.com/eggjs/egg-ts-helper/issues/111)) ([2bbc458](https://github.com/eggjs/egg-ts-helper/commit/2bbc458bd1d7d695f482ad88c5f3bbc5b365f2c7))

## [2.1.0](https://github.com/eggjs/egg-ts-helper/compare/v2.0.0...v2.1.0) (2023-08-31)


### Features

* use @eggjs/tsconfig ([#109](https://github.com/eggjs/egg-ts-helper/issues/109)) ([5b0a976](https://github.com/eggjs/egg-ts-helper/commit/5b0a976702e39f32b21c56fd9ec3400f608a65f4))

## [2.0.0](https://github.com/eggjs/egg-ts-helper/compare/v1.35.0...v2.0.0) (2023-08-02)


### ⚠ BREAKING CHANGES

* drop typescript v4 support

### Features

* use typescript v5 ([e05bbde](https://github.com/eggjs/egg-ts-helper/commit/e05bbde78e56c4add0caad2c93f0d2f7e787283d))

## [1.35.0](https://github.com/eggjs/egg-ts-helper/compare/v1.34.7...v1.35.0) (2023-08-02)


### Features

* use typescript v5 ([#107](https://github.com/eggjs/egg-ts-helper/issues/107)) ([a934501](https://github.com/eggjs/egg-ts-helper/commit/a9345017aad7aea1d612387881353f1e8662cef4))

## [1.34.7](https://github.com/eggjs/egg-ts-helper/compare/v1.34.6...v1.34.7) (2023-02-13)


### Bug Fixes

* should reset ETS_REGISTER_PID env after build ([#105](https://github.com/eggjs/egg-ts-helper/issues/105)) ([d706a31](https://github.com/eggjs/egg-ts-helper/commit/d706a31b2ede68ef64c17be02aed2055c1f8f790))

## [1.34.6](https://github.com/eggjs/egg-ts-helper/compare/v1.34.5...v1.34.6) (2023-02-09)


### Bug Fixes

* change to read ETS_SCRIPT_FRAMEWORK on postinstall script ([#104](https://github.com/eggjs/egg-ts-helper/issues/104)) ([57c9749](https://github.com/eggjs/egg-ts-helper/commit/57c97493b33a10ca8c148dc3e3c704cfccf2f687))

## [1.34.5](https://github.com/eggjs/egg-ts-helper/compare/v1.34.4...v1.34.5) (2023-02-03)


### Bug Fixes

* only deprecated options.framework on env.ETS_FRAMEWORK exists ([#103](https://github.com/eggjs/egg-ts-helper/issues/103)) ([441d3ff](https://github.com/eggjs/egg-ts-helper/commit/441d3ff697e5b8f7b0301ac66e91c7d14fa64342))

## [1.34.4](https://github.com/eggjs/egg-ts-helper/compare/v1.34.3...v1.34.4) (2023-02-03)


### Bug Fixes

* read default framework from env.ETS_FRAMEWORK ([#102](https://github.com/eggjs/egg-ts-helper/issues/102)) ([4160562](https://github.com/eggjs/egg-ts-helper/commit/41605624e52826f0e7fa1232824e74f4ed3d25ec))

## [1.34.3](https://github.com/eggjs/egg-ts-helper/compare/v1.34.2...v1.34.3) (2023-01-30)


### Bug Fixes

* disable eslint by default ([#101](https://github.com/eggjs/egg-ts-helper/issues/101)) ([ab5960e](https://github.com/eggjs/egg-ts-helper/commit/ab5960e60a7e893d68b849994eb2ccba9cf78191))

## [1.34.2](https://github.com/eggjs/egg-ts-helper/compare/v1.34.1...v1.34.2) (2023-01-17)


### Bug Fixes

* skip run when egg.Application not exists ([#100](https://github.com/eggjs/egg-ts-helper/issues/100)) ([62012fe](https://github.com/eggjs/egg-ts-helper/commit/62012fe40d91da832c687e186782ea73c3762bf8))

## [1.34.1](https://github.com/eggjs/egg-ts-helper/compare/v1.34.0...v1.34.1) (2023-01-11)


### Bug Fixes

* remove require cache ([#99](https://github.com/eggjs/egg-ts-helper/issues/99)) ([72e4161](https://github.com/eggjs/egg-ts-helper/commit/72e4161f309ddf62d9ada7d9162206b58072c8b0))

## [1.34.0](https://github.com/eggjs/egg-ts-helper/compare/v1.33.1...v1.34.0) (2023-01-05)


### Features

* remove debug deps ([#98](https://github.com/eggjs/egg-ts-helper/issues/98)) ([0a4403e](https://github.com/eggjs/egg-ts-helper/commit/0a4403ea3899b0a84ceeae39c5198629062853a1))

## [1.33.1](https://github.com/eggjs/egg-ts-helper/compare/v1.33.0...v1.33.1) (2022-12-19)


### Bug Fixes

* clean ignore tegg .sff dir ([#93](https://github.com/eggjs/egg-ts-helper/issues/93)) ([6cc3183](https://github.com/eggjs/egg-ts-helper/commit/6cc3183aa152a37d1d42bfca1792db91381b22d3))


---

1.33.0 / 2022-07-25
==================

**features**
  * [[`d14405d`](http://github.com/whxaxes/egg-ts-helper/commit/d14405dd0c39ae5276a4d2ba1aeeb466aa1e5e3c)] - feat: deprecated clean command (#92) (吖猩 <<whxaxes@gmail.com>>)

1.32.0 / 2022-07-25
==================

**features**
  * [[`802f578`](http://github.com/whxaxes/egg-ts-helper/commit/802f578db9a3708ea61cc7cb822bdad3e8bad265)] - feat: export register and command clazz (#91) (吖猩 <<whxaxes@gmail.com>>)

1.31.2 / 2022-07-18
==================

**fixes**
  * [[`9089ca8`](http://github.com/whxaxes/egg-ts-helper/commit/9089ca896e48f649b38ff47d995970ac54446c48)] - fix: ETS_REGISTER_PID should not relate watch mode (#90) (mansonchor.github.com <<mansonchor1987@gmail.com>>)

1.31.1 / 2022-07-18
==================

**fixes**
  * [[`9469ecc`](http://github.com/whxaxes/egg-ts-helper/commit/9469ecca8457c3700bab9169b088129e5f588a03)] - fix: should not use exports (#89) (吖猩 <<whxaxes@gmail.com>>)

1.31.0 / 2022-07-18
==================

**features**
  * [[`874c1b2`](http://github.com/whxaxes/egg-ts-helper/commit/874c1b210e48626a33a98cafaba4a0bf986b3372)] - feat: make command & register as clazz (#88) (吖猩 <<whxaxes@gmail.com>>)

1.30.4 / 2022-06-30
==================

**fixes**
  * [[`6a73a32`](http://github.com/whxaxes/egg-ts-helper/commit/6a73a32893e1ad1d324252ea8879696b45e66cfa)] - fix: ignore options not works (#87) (吖猩 <<whxaxes@gmail.com>>)
  * [[`c2fe947`](http://github.com/whxaxes/egg-ts-helper/commit/c2fe947b6ecdb3b844de0ba4f1a00a62b5a81341)] - fix: use execFile for getEggInfo (#86) (zhangyuantao <<zhangyuantao@163.com>>)

1.30.3 / 2022-04-24
==================

**fixes**
  * [[`67e667d`](http://github.com/whxaxes/egg-ts-helper/commit/67e667d21b15de4f972db76ca595de20e8136c13)] - fix: startup failed in node18 (#83) (吖猩 <<whxaxes@gmail.com>>)

1.30.2 / 2022-02-16
==================

**fixes**
  * [[`371d743`](http://github.com/whxaxes/egg-ts-helper/commit/371d7436f6b5441674cd62390c96fbb1fc94ccd1)] - fix: load tsconfig with extends (#82) (吖猩 <<whxaxes@gmail.com>>)

1.30.1 / 2022-02-15
==================

**fixes**
  * [[`a12ea16`](http://github.com/whxaxes/egg-ts-helper/commit/a12ea16357f7b190ca50b3b20a1a0274ba580f40)] - fix: exports (wanghx <<whxaxes@gmail.com>>)

1.30.0 / 2022-02-15
==================

**features**
  * [[`5609eb3`](http://github.com/whxaxes/egg-ts-helper/commit/5609eb39b6decbfda0b19d7e6a89d4fe94405d8f)] - feat: support class style generator (#80) (吖猩 <<whxaxes@gmail.com>>)

1.29.1 / 2021-10-14
==================

**fixes**
  * [[`757fd30`](http://github.com/whxaxes/egg-ts-helper/commit/757fd30d4de9906db4dd2f132965c9ca88ea7958)] - fix: plugin path (#79) (吖猩 <<whxaxes@gmail.com>>)

1.29.0 / 2021-10-14
==================

**features**
  * [[`94db906`](http://github.com/whxaxes/egg-ts-helper/commit/94db9068bd34e5912d74e60c61e7acd7a25331c7)] - feat: update watchDirs to generatorConfig (#78) (吖猩 <<whxaxes@gmail.com>>)

1.28.0 / 2021-10-13
==================

**features**
  * [[`3e4509d`](http://github.com/whxaxes/egg-ts-helper/commit/3e4509dba8243a0171c8d85c448c3ec2aa1e7974)] - feat: support custom loader (#77) (吖猩 <<whxaxes@gmail.com>>)

1.27.0 / 2021-09-17
==================

**features**
  * [[`6e2bd32`](http://github.com/whxaxes/egg-ts-helper/commit/6e2bd32038d3ff83100b56d7288791810de67947)] - feat: register use tsconfig.json , parse use json5 (#76) (Bung <<crc32@qq.com>>)

**fixes**
  * [[`d10b55b`](http://github.com/whxaxes/egg-ts-helper/commit/d10b55bb93dfe480915ca02767c27f8538d0a9e3)] - fix: should read pluginInfo.path (#74) (kiho <<monkindey@163.com>>)

1.26.0 / 2021-08-02
==================

**features**
  * [[`d45266c`](http://github.com/whxaxes/egg-ts-helper/commit/d45266c924d42a776d4f296c74482dc1aaa27ea0)] - feat: upgrade chokidar (#66) (吖猩 <<whxaxes@gmail.com>>)

1.25.9 / 2021-04-23
==================

**fixes**
  * [[`e0f067e`](http://github.com/whxaxes/egg-ts-helper/commit/e0f067e5d7f1c9ac21fdf03357a6c7b120eaac56)] - fix: remove ts args checking (#73) (吖猩 <<whxaxes@gmail.com>>)

1.25.8 / 2020-04-30
==================

**fixes**
  * [[`f633470`](http://github.com/whxaxes/egg-ts-helper/commit/f6334701fb91e9c9e03ec22f8e5af7b948f2be1a)] - fix: autoRemoveJs should works in register (#62) (吖猩 <<whxaxes@gmail.com>>)

**others**
  * [[`8f2c7a7`](http://github.com/whxaxes/egg-ts-helper/commit/8f2c7a7d518d0c5cca9a97573bc83ea91373bbb0)] - docs: update options (吖猩 <<whxaxes@gmail.com>>)

1.25.7 / 2020-03-05
==================

**features**
  * [[`cfed138`](http://github.com/whxaxes/egg-ts-helper/commit/cfed13880588650cc5bc9514cf775a12c080cb29)] - feat: support multi-level directory with intersection types (#53) (jinasonlin <<jinasonlin@gmail.com>>)

**fixes**
  * [[`29b6299`](http://github.com/whxaxes/egg-ts-helper/commit/29b6299118f814173d12c5e83569c08559ab3384)] - fix: service is method (#58) (吖猩 <<whxaxes@gmail.com>>)

1.25.6 / 2019-08-21
==================

**fixes**
  * [[`368e2a9`](http://github.com/whxaxes/egg-ts-helper/commit/368e2a99d303668ac540a56d47a489149d634a2c)] - fix: fix config types error (#51) (吖猩 <<whxaxes@gmail.com>>)
  * [[`a357f28`](http://github.com/whxaxes/egg-ts-helper/commit/a357f286d3c41c3d87211f8fb72897b5ee7330ec)] - fix: travis ci (wanghx <<whxaxes@gmail.com>>)

1.25.5 / 2019-06-23
==================

**fixes**
  * [[`8dcb9f2`](http://github.com/whxaxes/egg-ts-helper/commit/8dcb9f2da0814370f789a64d7f817b075971f8c7)] - fix: duplicate declaration (#50) (吖猩 <<whxaxes@gmail.com>>)

1.25.4 / 2019-06-10
==================

**features**
  * [[`8003dc2`](http://github.com/whxaxes/egg-ts-helper/commit/8003dc238ab845c291ee6c6a2e390f2669dbd8a0)] - feat: remove compatible for sequelize (#49) (吖猩 <<whxaxes@gmail.com>>)

1.25.3 / 2019-05-26
==================

**fixes**
  * [[`0cce02d`](http://github.com/whxaxes/egg-ts-helper/commit/0cce02dab86f05573fd50eccd703e4e23a7cb569)] - fix: same name dir and file (#48) (吖猩 <<whxaxes@gmail.com>>)

1.25.2 / 2019-03-26
==================

**fixes**
  * [[`928fad6`](http://github.com/whxaxes/egg-ts-helper/commit/928fad663cdf5da7352c7fd534dcd4d46d238d59)] - fix: downgrade ts-node (#46) (吖猩 <<whxaxes@qq.com>>)

1.25.1 / 2019-03-25
===================

  * [[`f36d699`](http://github.com/whxaxes/egg-ts-helper/commit/f36d69934403424f9715984dc9483c038b89725d)] - fix: check framework before deprecated (wanghx <<whxaxes@gmail.com>>)

1.25.0 / 2019-03-25
===================

  * [[`958b117`](http://github.com/whxaxes/egg-ts-helper/commit/958b1172c09a59eb0122bfa5e8afe9b296325faa)] - feat: config improvement (#45) (吖猩 <<whxaxes@qq.com>>)

1.24.2 / 2019-03-21
===================

  * fix: should clean file more intelligent (#44)

1.24.1 / 2019-03-11
===================

  * fix: clean files before startup & model compatible (#43)

1.24.0 / 2019-03-10
===================

  * feat: speed up booting (#42)
  * feat: add custom loader support (#41)
  * feat: load all plugins (#32)

1.23.0 / 2019-03-06
===================

  * feat: clean js file while it has the same name tsx file too (#40)
  * fix: spawn eagain (#38)

1.22.3 / 2019-02-24
===================

  * fix: register should use env instead of file (#37)

1.22.2 / 2019-02-23
===================

  * fix: no need to clean cache file (#36)

1.22.1 / 2019-02-18
===================

  * fix: ignore watcher initial (#33)
  * docs: update docs

1.22.0 / 2019-02-14
===================

  * feat: auto gen jsconfig in js project & pass options from env (#31)

1.21.0 / 2019-02-02
===================

  * feat: add Egg to global namespace (#30)

1.20.0 / 2019-01-06
===================

  * generator support default config
  * add silent to options of TsHelper
  * ext of config file default to .js or .json
  * add init command

1.19.2 / 2018-12-20
===================

  * fix: agent should merge to Agent (#26)

1.19.1 / 2018-12-12
===================

  * fix:  interfaceHandle cannot be covered (#25)

1.19.0 / 2018-12-12
===================

  * feat: generator of configure support file path
  * feat: add a new generator: auto
  * refactor: code splitting and add a new class Watcher

1.18.0 / 2018-12-10
===================

  * feat: interfaceHandle can be string
  * fix: interfaceHandle in `function` or `object` can be overwrite.

1.17.1 / 2018-12-05
===================

  * fix: fixed clean bug

1.17.0 / 2018-12-05
===================

  * feat: support js project & add oneForAll option (#21)

1.16.1 / 2018-11-29
===================

  * fix: add tslib deps

1.16.0 / 2018-11-29
===================

  * chore: update comment
  * feat: add prefix to interface
  * refactor: add esModuleInterop option
  * feat: add new generator `function` and `object`
  * refactor: refactor build-in generators

1.15.0 / 2018-11-28
===================

  * feat: add `declareTo` option
  * chore: upgrade typescript to 3.0

1.14.0 / 2018-11-12
===================

  * feat: caseStyle option add function support (#19)

1.13.0 / 2018-10-13
===================

  * feat: silent in test (#17)

1.12.1 / 2018-09-30
===================

  * fix: interface don't contain semicolon (#15)

1.12.0 / 2018-09-30
===================

  * feat: generate extend type with env (#14)

1.11.0 / 2018-09-10
===================

  * feat: Code Optimization (#10)

1.10.0 / 2018-08-30
===================

  * feat: model.enabled default to true
  * feat: add model check and only read framework from tsHelper.framework
  * docs: update docs

1.9.0 / 2018-06-22
==================

  * feat: add chokidar options

1.8.0 / 2018-05-29
==================

  * feat: support model

1.7.1 / 2018-05-22
==================

  * fix: fixed mistake of middleware dts

1.7.0 / 2018-05-07
==================

  * fix: lint fix
  * feat: support auto created d.ts for middleware

1.6.1 / 2018-04-23
==================

  * fix: make sure register was running only once time

1.6.0 / 2018-04-10
==================

  * feat: do not write file if ts not changed
  * feat: add plugin generator
