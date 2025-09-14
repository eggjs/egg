# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## [7.3.1](https://github.com/eggjs/bin/compare/v7.3.0...v7.3.1) (2025-04-19)


### Bug Fixes

* properly quote paths ([#289](https://github.com/eggjs/bin/issues/289)) ([dcff9ac](https://github.com/eggjs/bin/commit/dcff9acd9419ff2eb7be4c189e68804ff71b01e8))

## [7.3.0](https://github.com/eggjs/bin/compare/v7.2.0...v7.3.0) (2025-03-14)


### Features

* use mochawesome-with-mocha@8 ([#288](https://github.com/eggjs/bin/issues/288)) ([2e2e3cf](https://github.com/eggjs/bin/commit/2e2e3cf8f46833b76ff8619c96ccbd7fb56cd470))

## [7.2.0](https://github.com/eggjs/bin/compare/v7.1.0...v7.2.0) (2025-02-13)


### Features

* support parallel tests ([#287](https://github.com/eggjs/bin/issues/287)) ([b3f2b6c](https://github.com/eggjs/bin/commit/b3f2b6cb531a6bef17ae12d4fcf1a2bfd9316263))

## [7.1.0](https://github.com/eggjs/bin/compare/v7.0.4...v7.1.0) (2025-02-04)


### Features

* use egg-ts-helper@3 ([ebfc9c4](https://github.com/eggjs/bin/commit/ebfc9c44fed52c6a4e750f31332abb0abd1f1bb2))

## [7.0.4](https://github.com/eggjs/bin/compare/v7.0.3...v7.0.4) (2025-02-04)


### Bug Fixes

* postinstall from root dir ([9033e50](https://github.com/eggjs/bin/commit/9033e504f49f87faf686c14becf916bc665f285d))

## [7.0.3](https://github.com/eggjs/bin/compare/v7.0.2...v7.0.3) (2025-02-04)


### Bug Fixes

* enable postinstall ([#285](https://github.com/eggjs/bin/issues/285)) ([4406d92](https://github.com/eggjs/bin/commit/4406d927fab1be56891f23f86a85f0061bc313fd))

## [7.0.2](https://github.com/eggjs/bin/compare/v7.0.1...v7.0.2) (2025-01-03)


### Bug Fixes

* auto import tsconfig-paths/register.js ([#282](https://github.com/eggjs/bin/issues/282)) ([515614a](https://github.com/eggjs/bin/commit/515614a2338381c5a5878c2af794a9b1964a2e90))

## [7.0.1](https://github.com/eggjs/bin/compare/v7.0.0...v7.0.1) (2024-12-29)


### Bug Fixes

* auto set mocha @eggjs/mock/register on application project type ([#281](https://github.com/eggjs/bin/issues/281)) ([929c0f8](https://github.com/eggjs/bin/commit/929c0f8cac43a5798b207dd26d7b9ba26ae9ada1))

## [7.0.0](https://github.com/eggjs/bin/compare/v6.13.0...v7.0.0) (2024-12-27)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

use https://oclif.io

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
	- Removed pull request template for contributors.
	- Introduced a new workflow for automating commit publishing.
	- Added scripts for executing Node.js applications in development mode.
	- Updated the README to reflect the new package name and other details.
	- Enhanced command classes for testing and development functionalities.
	- Added new utility functions for better path handling in tests.
	- Introduced new interface for package configuration.
	- Added support for TypeScript with updated configurations.
	- Implemented a new logging mechanism in hooks for better debugging.
- Introduced a new class for managing server readiness in demo
applications.

- **Bug Fixes**
- Adjusted import paths in tests for compatibility with new module
structure.

- **Documentation**
- Updated README and various documentation links to reflect changes in
package structure.

- **Chores**
- Updated package configurations, including versioning and dependencies.
	- Removed obsolete files and configurations from the project.
	- Enhanced test suite structure and clarity.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#279](https://github.com/eggjs/bin/issues/279)) ([7078748](https://github.com/eggjs/bin/commit/7078748da943e07b4dcc5b213d7dcd417d2d6eee))

## [6.13.0](https://github.com/eggjs/egg-bin/compare/v6.12.0...v6.13.0) (2024-12-11)


### Features

* use @eggjs/utils v4 ([#278](https://github.com/eggjs/egg-bin/issues/278)) ([aedf803](https://github.com/eggjs/egg-bin/commit/aedf803a863b082dc41ee9f6ed41b500dbfc902e))

## [6.12.0](https://github.com/eggjs/egg-bin/compare/v6.11.0...v6.12.0) (2024-12-10)


### Features

* use runscript v2 ([#276](https://github.com/eggjs/egg-bin/issues/276)) ([8fac9ae](https://github.com/eggjs/egg-bin/commit/8fac9ae10380c5e768845e9ceb991549d1b3c4fe))

## [6.11.0](https://github.com/eggjs/egg-bin/compare/v6.10.0...v6.11.0) (2024-12-08)


### Features

* use detect-port v2 ([#275](https://github.com/eggjs/egg-bin/issues/275)) ([4816db4](https://github.com/eggjs/egg-bin/commit/4816db4d0e111d9f46d8547a17b6cf430a89d225))

## [6.10.0](https://github.com/eggjs/egg-bin/compare/v6.9.0...v6.10.0) (2024-06-11)


### Features

* [Snyk] Security upgrade c8 from 9.1.0 to 10.0.0 ([#272](https://github.com/eggjs/egg-bin/issues/272)) ([2535a8e](https://github.com/eggjs/egg-bin/commit/2535a8e57e2ae7482516bac2309d04cf69bac22d))

## [6.9.0](https://github.com/eggjs/egg-bin/compare/v6.8.1...v6.9.0) (2024-05-08)


### Features

* use @eggjs/utils@3 ([#268](https://github.com/eggjs/egg-bin/issues/268)) ([cac459c](https://github.com/eggjs/egg-bin/commit/cac459c183c9d66e45dcb8bb9afd849a8814fa82))

## [6.8.1](https://github.com/eggjs/egg-bin/compare/v6.8.0...v6.8.1) (2024-03-06)


### Bug Fixes

* fix execArgv not work in cov ([#255](https://github.com/eggjs/egg-bin/issues/255)) ([cc8c063](https://github.com/eggjs/egg-bin/commit/cc8c063df714a11bb5203a5c7ad84cb0b185229b))

## [6.8.0](https://github.com/eggjs/egg-bin/compare/v6.7.0...v6.8.0) (2024-02-01)


### Features

* supports retrieving the port from the configuration file ([#251](https://github.com/eggjs/egg-bin/issues/251)) ([07e150f](https://github.com/eggjs/egg-bin/commit/07e150f0f1cae2a75353428c9d10b4e9a16fd0db))

## [6.7.0](https://github.com/eggjs/egg-bin/compare/v6.6.0...v6.7.0) (2024-01-09)


### Features

* egg-ts-helper 1.30.3 to 2.1.0 ([#249](https://github.com/eggjs/egg-bin/issues/249)) ([34e3b92](https://github.com/eggjs/egg-bin/commit/34e3b928a2bb5114a8128429b29286d3dca5274d))

## [6.6.0](https://github.com/eggjs/egg-bin/compare/v6.5.2...v6.6.0) (2024-01-07)


### Features

* should run ets on pkg.egg.declarations = true ([#248](https://github.com/eggjs/egg-bin/issues/248)) ([018801a](https://github.com/eggjs/egg-bin/commit/018801a241324626748c0d9ea90573349cd3d2fa))

## [6.5.2](https://github.com/eggjs/egg-bin/compare/v6.5.1...v6.5.2) (2023-09-16)


### Bug Fixes

* ignore ExperimentalWarning on esm module ([#241](https://github.com/eggjs/egg-bin/issues/241)) ([6a2521a](https://github.com/eggjs/egg-bin/commit/6a2521a2c11ac9416a21b01b37aad50f50c9ff49))

## [6.5.1](https://github.com/eggjs/egg-bin/compare/v6.5.0...v6.5.1) (2023-09-16)


### Bug Fixes

* use ts-node inside the egg-bin deps ([#240](https://github.com/eggjs/egg-bin/issues/240)) ([f13df56](https://github.com/eggjs/egg-bin/commit/f13df56a1dfd4e69822392c4ad47c6aa785f1cac))

## [6.5.0](https://github.com/eggjs/egg-bin/compare/v6.4.2...v6.5.0) (2023-09-15)


### Features

* support run test/cov on esm package ([#239](https://github.com/eggjs/egg-bin/issues/239)) ([6ae1044](https://github.com/eggjs/egg-bin/commit/6ae10444af01cccfac19b2e4210f7fb06382e728))

## [6.4.2](https://github.com/eggjs/egg-bin/compare/v6.4.1...v6.4.2) (2023-08-05)


### Bug Fixes

* convert unhandled rejection to uncaught exception ([#235](https://github.com/eggjs/egg-bin/issues/235)) ([1e25880](https://github.com/eggjs/egg-bin/commit/1e25880848849cb5fee63fd7e9982afbf09301da))

## [6.4.1](https://github.com/eggjs/egg-bin/compare/v6.4.0...v6.4.1) (2023-06-03)


### Bug Fixes

* detect file changes on Windows ([#234](https://github.com/eggjs/egg-bin/issues/234)) ([38f1c6c](https://github.com/eggjs/egg-bin/commit/38f1c6ccc642e941f65f5b2b370116804827801b))

## [6.4.0](https://github.com/eggjs/egg-bin/compare/v6.3.0...v6.4.0) (2023-04-18)


### Features

* append cobertura to support diff line coverage ([#227](https://github.com/eggjs/egg-bin/issues/227)) ([ddf732f](https://github.com/eggjs/egg-bin/commit/ddf732fba211b2123da568bbb1ee6d84d046c083))
* output cobertura report by default ([#228](https://github.com/eggjs/egg-bin/issues/228)) ([8818a3d](https://github.com/eggjs/egg-bin/commit/8818a3ded5e40ced3c1f72f384a14beded595f35))

## [6.3.0](https://github.com/eggjs/egg-bin/compare/v6.2.0...v6.3.0) (2023-04-06)


### Features

* tsc target to ES2022 ([#225](https://github.com/eggjs/egg-bin/issues/225)) ([9d6f835](https://github.com/eggjs/egg-bin/commit/9d6f83549b78a1040230645eee9efe2ec2bdecb6))

## [6.1.2](https://github.com/eggjs/egg-bin/compare/v6.1.1...v6.1.2) (2023-02-17)


### Bug Fixes

* should support windows and Node.js 14 ([#223](https://github.com/eggjs/egg-bin/issues/223)) ([8f1b709](https://github.com/eggjs/egg-bin/commit/8f1b709961475c10dbbc4d8c51ed2c54af8a39ce))

## [6.1.1](https://github.com/eggjs/egg-bin/compare/v6.1.0...v6.1.1) (2023-02-14)


### Bug Fixes

* add scripts dir to exclude ([#219](https://github.com/eggjs/egg-bin/issues/219)) ([0fb74f7](https://github.com/eggjs/egg-bin/commit/0fb74f7bb85db47f6dd03697fd500d518e4907e5))

## [6.1.0](https://github.com/eggjs/egg-bin/compare/v6.0.0...v6.1.0) (2023-02-14)


### Features

* support grep pattern in 6.x ([#220](https://github.com/eggjs/egg-bin/issues/220)) ([7fedc6d](https://github.com/eggjs/egg-bin/commit/7fedc6d2fd2108b9b2aace04687a9bae03e634a6))

## [6.0.0](https://github.com/eggjs/egg-bin/compare/v5.13.4...v6.0.0) (2023-02-12)


### ⚠ BREAKING CHANGES

* drop Node.js 14 support and more deprecated features

### Features

* use @artus-cli/artus-cli ([#217](https://github.com/eggjs/egg-bin/issues/217)) ([2b801e9](https://github.com/eggjs/egg-bin/commit/2b801e99d3be6b7dc27b46cc1992cec4089759ad))

## [5.13.4](https://github.com/eggjs/egg-bin/compare/v5.13.3...v5.13.4) (2023-02-09)


### Bug Fixes

* set ETS_SCRIPT_FRAMEWORK ([#216](https://github.com/eggjs/egg-bin/issues/216)) ([8614367](https://github.com/eggjs/egg-bin/commit/8614367f5b1c21d3ded9fb7f42d19d3189567d6d))

## [5.13.3](https://github.com/eggjs/egg-bin/compare/v5.13.2...v5.13.3) (2023-02-06)


### Bug Fixes

* not set ETS_FRAMEWORK ([#215](https://github.com/eggjs/egg-bin/issues/215)) ([b8f1c91](https://github.com/eggjs/egg-bin/commit/b8f1c914c9094c1f6e464fbee659f7a843f0b859)), closes [#214](https://github.com/eggjs/egg-bin/issues/214)

## [5.13.2](https://github.com/eggjs/egg-bin/compare/v5.13.1...v5.13.2) (2023-02-03)


### Bug Fixes

* should set ETS_FRAMEWORK to real framework package name ([#214](https://github.com/eggjs/egg-bin/issues/214)) ([fb3eb6a](https://github.com/eggjs/egg-bin/commit/fb3eb6aa8b0b3cd02eda28e0abce0e688bfdb4b4))

## [5.13.1](https://github.com/eggjs/egg-bin/compare/v5.13.0...v5.13.1) (2023-01-30)


### Bug Fixes

* ignore ets when the current app don't has a framework dependencies ([#213](https://github.com/eggjs/egg-bin/issues/213)) ([666a342](https://github.com/eggjs/egg-bin/commit/666a342a28593942fb7e3de6648d4abf66c83ec1))

## [5.13.0](https://github.com/eggjs/egg-bin/compare/v5.12.6...v5.13.0) (2023-01-18)


### Features

* use util.debug instead of debug module ([#212](https://github.com/eggjs/egg-bin/issues/212)) ([33c95c2](https://github.com/eggjs/egg-bin/commit/33c95c20b44c7be267bb47399d2ce963214989d0))

## [5.12.3](https://github.com/eggjs/egg-bin/compare/v5.12.2...v5.12.3) (2023-01-13)


### Bug Fixes

* require tscompiler on current process ([#207](https://github.com/eggjs/egg-bin/issues/207)) ([3462835](https://github.com/eggjs/egg-bin/commit/3462835bf9060721a50e04cfeada601bb97cd0dc))

## [5.12.2](https://github.com/eggjs/egg-bin/compare/v5.12.1...v5.12.2) (2023-01-11)


### Bug Fixes

* dont auto require egg-mock ([#206](https://github.com/eggjs/egg-bin/issues/206)) ([e703507](https://github.com/eggjs/egg-bin/commit/e70350762f76372925c3c4cdbc50e17fa40383a4)), closes [/github.com/eggjs/egg-mock/pull/142#issuecomment-1377450602](https://github.com/eggjs//github.com/eggjs/egg-mock/pull/142/issues/issuecomment-1377450602)

## [5.12.1](https://github.com/eggjs/egg-bin/compare/v5.12.0...v5.12.1) (2023-01-10)


### Bug Fixes

* use egg-mock/register instead ([#205](https://github.com/eggjs/egg-bin/issues/205)) ([c267288](https://github.com/eggjs/egg-bin/commit/c267288eb1610cd859be66d023d27e4d72671b58))

## [5.12.0](https://github.com/eggjs/egg-bin/compare/v5.11.3...v5.12.0) (2023-01-09)


### Features

* allow require mocha from outside ([#204](https://github.com/eggjs/egg-bin/issues/204)) ([6f59f6e](https://github.com/eggjs/egg-bin/commit/6f59f6effed71e898fe743fc1d29a6537029b1c7))

## [5.11.3](https://github.com/eggjs/egg-bin/compare/v5.11.2...v5.11.3) (2023-01-06)


### Bug Fixes

* ignore egg module on ets ([#203](https://github.com/eggjs/egg-bin/issues/203)) ([dda64a5](https://github.com/eggjs/egg-bin/commit/dda64a5f895aac9787b07f4a9c0285ac7701bdc1))

## [5.11.2](https://github.com/eggjs/egg-bin/compare/v5.11.1...v5.11.2) (2023-01-05)


### Bug Fixes

* use node to run postinstall script ([f17347b](https://github.com/eggjs/egg-bin/commit/f17347b670c8d39b32c5c7322e1e30d9c7823b72))

## [5.11.1](https://github.com/eggjs/egg-bin/compare/v5.11.0...v5.11.1) (2023-01-05)


### Bug Fixes

* should set ETS_CWD  to INIT_CWD on postinstall ([#202](https://github.com/eggjs/egg-bin/issues/202)) ([a57c1d4](https://github.com/eggjs/egg-bin/commit/a57c1d4f5bfe229d1f6d3a6eb1957996d0b115ff))

## [5.11.0](https://github.com/eggjs/egg-bin/compare/v5.10.0...v5.11.0) (2023-01-05)


### Features

* auto run ets on postinstall ([#201](https://github.com/eggjs/egg-bin/issues/201)) ([3e30c3d](https://github.com/eggjs/egg-bin/commit/3e30c3d6842b9a94dd631b93956c8a2201816025))

## [5.10.0](https://github.com/eggjs/egg-bin/compare/v5.9.0...v5.10.0) (2023-01-03)


### Features

* use mochawesome-with-mocha and enable mochawesome by default ([#200](https://github.com/eggjs/egg-bin/issues/200)) ([efa6ef5](https://github.com/eggjs/egg-bin/commit/efa6ef58df4756216b7e80adad9fb1c852c8c9f4))

## [5.9.0](https://github.com/eggjs/egg-bin/compare/v5.8.1...v5.9.0) (2022-12-18)


### Features

* auto require tsconfig-paths/register on typescript command ([#199](https://github.com/eggjs/egg-bin/issues/199)) ([82e3e3e](https://github.com/eggjs/egg-bin/commit/82e3e3ededd68258c5878e728553894fbd001d6d))

## [5.8.1](https://github.com/eggjs/egg-bin/compare/v5.8.0...v5.8.1) (2022-12-18)


### Bug Fixes

* add missing custom require ([#198](https://github.com/eggjs/egg-bin/issues/198)) ([1348220](https://github.com/eggjs/egg-bin/commit/13482208f117d2d3fa7d70334b84ef2791847acd))

## [5.8.0](https://github.com/eggjs/egg-bin/compare/v5.7.0...v5.8.0) (2022-12-18)


### Features

* [BREAKING CHANGE] drop espower support ([#197](https://github.com/eggjs/egg-bin/issues/197)) ([1fc3624](https://github.com/eggjs/egg-bin/commit/1fc362449b69502deb87671a7c1aa21bd5070c51))

## [5.7.0](https://github.com/eggjs/egg-bin/compare/v5.6.1...v5.7.0) (2022-12-18)


### Features

* disable espower by default ([#196](https://github.com/eggjs/egg-bin/issues/196)) ([5e35438](https://github.com/eggjs/egg-bin/commit/5e3543812854066a72e6ff61fda001b23bf493ad))

## [5.6.1](https://github.com/eggjs/egg-bin/compare/v5.6.0...v5.6.1) (2022-12-17)


### Bug Fixes

* revert mochawesome to false by default ([#195](https://github.com/eggjs/egg-bin/issues/195)) ([9c48e10](https://github.com/eggjs/egg-bin/commit/9c48e10d48be54945dce7ce6b3b673f971302fae))

## [5.6.0](https://github.com/eggjs/egg-bin/compare/v5.5.0...v5.6.0) (2022-12-17)


### Features

* enable mochawesome by default ([#193](https://github.com/eggjs/egg-bin/issues/193)) ([6636e8f](https://github.com/eggjs/egg-bin/commit/6636e8f7cf3227e05a5b9acf1b1a0b4bd7291fb8))


5.5.0 / 2022-11-19
==================

**features**
  * [[`3c326b3`](http://github.com/eggjs/egg-bin/commit/3c326b3a5280a7272c84a248e387b590468500b7)] - 📦 NEW: Support mochawesome reporter (#192) (fengmk2 <<fengmk2@gmail.com>>)

5.4.1 / 2022-11-15
==================

**fixes**
  * [[`bfd7fab`](http://github.com/eggjs/egg-bin/commit/bfd7fabffa3ae795ab4ca6494bb3cdc0138d59ff)] - fix: --full-trace should be boolean (#191) (Haoliang Gao <<sakura9515@gmail.com>>)

**others**
  * [[`85581d2`](http://github.com/eggjs/egg-bin/commit/85581d2e77c9490fb196b1d844b57c4330539a5c)] - 🤖 TEST: Only test on Linux and macOS (#190) (fengmk2 <<fengmk2@gmail.com>>)

5.4.0 / 2022-11-11
==================

**features**
  * [[`72e925b`](http://github.com/eggjs/egg-bin/commit/72e925b490fa215432c76e46f6361bf52c169cc6)] - feat: default enable c8 report (#189) (killa <<killa123@126.com>>)

5.3.3 / 2022-11-10
==================

**fixes**
  * [[`e18ceda`](http://github.com/eggjs/egg-bin/commit/e18cedaf5482c1c58becc6674e3e7a512139f097)] - fix: fix cov env (#188) (killa <<killa123@126.com>>)

5.3.2 / 2022-11-09
==================

**fixes**
  * [[`88ba6d5`](http://github.com/eggjs/egg-bin/commit/88ba6d5b2d7dfd3d349d9687a57948d76b757885)] - fix: fix ENABLE_MOCHA_PARALLEL/AUTO_AGENT env (#187) (killa <<killa123@126.com>>)

5.3.1 / 2022-11-05
==================

**fixes**
  * [[`c5db00e`](http://github.com/eggjs/egg-bin/commit/c5db00eab9846c32d491487ac04cc4388565d9f8)] - fix: ignore eggTsHelper on node-test (#186) (fengmk2 <<fengmk2@gmail.com>>)

5.3.0 / 2022-11-04
==================

**features**
  * [[`78141e8`](http://github.com/eggjs/egg-bin/commit/78141e83a83f69f769470a100688c415a0ae1070)] - feat: impl parallel for mocha parallel mode (#185) (killa <<killa123@126.com>>)

5.2.0 / 2022-07-15
==================

**features**
  * [[`f564cbf`](http://github.com/eggjs/egg-bin/commit/f564cbf20be3b7eb7eed61b2fc95a2afa0b5936e)] - feat: support set eggTsHelper (#183) (mansonchor.github.com <<mansonchor1987@gmail.com>>)

5.1.2 / 2022-07-05
==================

**fixes**
  * [[`a1ec4f7`](http://github.com/eggjs/egg-bin/commit/a1ec4f7e4857bdbd15cc9a9f0e1948dd7f5c348a)] - fix: conflix source map support (#181) (吖猩 <<whxaxes@gmail.com>>)

5.1.1 / 2022-06-23
==================

**fixes**
  * [[`2e0fecd`](http://github.com/eggjs/egg-bin/commit/2e0fecd06e9c901d370d54542e1aa6dc7b183403)] - fix: fix espwoer-typescript inject logic (#178) (Yiyu He <<dead_horse@qq.com>>)

5.1.0 / 2022-06-04
==================

**others**
  * [[`84489fe`](http://github.com/eggjs/egg-bin/commit/84489feb1341fad381e271efa39fe5d33317c776)] - 📦 NEW: Support run test with node:test (#177) (fengmk2 <<fengmk2@gmail.com>>)

5.0.0 / 2022-06-04
==================

**features**
  * [[`1e96da2`](http://github.com/eggjs/egg-bin/commit/1e96da2bb68203a5e972645df51ed0aa47ccaa8c)] - feat: support c8 report (#172) (羊鹿 <<general_up@163.com>>)

**others**
  * [[`6fb02f9`](http://github.com/eggjs/egg-bin/commit/6fb02f94b7d0f2b755a6b7c5eb780dca73cfc53e)] - 📦 NEW: [BREAKING] Only support Node.js 14 (#176) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`f32030b`](http://github.com/eggjs/egg-bin/commit/f32030b3b763e9f90c7b7f3d2f9f0f0b986051d3)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)
  * [[`c84671c`](http://github.com/eggjs/egg-bin/commit/c84671cc066f6ed7b26b070b4af688676beade2f)] - chore: update build status badge url (#174) (XiaoRui <<xiangwu619@gmail.com>>)

4.18.1 / 2022-02-18
==================

**fixes**
  * [[`662b9e9`](http://github.com/eggjs/egg-bin/commit/662b9e924d8e83959ee44e2ef4b1ac7541378b33)] - fix: using ts-node in app should check tscompiler and deps (#170) (吖猩 <<whxaxes@gmail.com>>),

4.18.0 / 2022-02-16
==================

**features**
  * [[`4a54cec`](http://github.com/eggjs/egg-bin/commit/4a54cec8561595b33984e41982e8d1da96a6bd47)] - feat: allow loading ts compiler from cwd (#169) (Deng Ruoqi <<drqzju@gmail.com>>)

4.17.0 / 2022-01-21
==================

**others**
  * [[`6403b4a`](http://github.com/eggjs/egg-bin/commit/6403b4aac8aa4cd872ecddbaf1ff118e98b0a192)] - support --intelli-espower-loader option (#168) (羊鹿 <<general_up@163.com>>)

4.16.4 / 2021-07-09
==================

**others**
  * [[`0765c4c`](http://github.com/eggjs/egg-bin/commit/0765c4cdc3abc1f4181dec2e31142ce5224a2cdf)] - ci: support node-v8.x (#164) (hyj1991 <<yeekwanvong@gmail.com>>)

4.16.3 / 2021-07-08
==================

**fixes**
  * [[`4a076e6`](http://github.com/eggjs/egg-bin/commit/4a076e606428b7eb80bdaa0e358cf4138a3ab0df)] - fix: ci failed (#162) (hyj1991 <<yeekwanvong@gmail.com>>)

**others**
  * [[`c915f1a`](http://github.com/eggjs/egg-bin/commit/c915f1a65340e1cfa04cf213a957f7ed9ac1c148)] - chore: update deps (#161) (hyj1991 <<yeekwanvong@gmail.com>>)

4.16.2 / 2021-05-14
==================

**fixes**
  * [[`563923a`](http://github.com/eggjs/egg-bin/commit/563923a68c0c0ae09075c4cedb855400deea623f)] - fix: remove espower typescript (#160) (吖猩 <<whxaxes@gmail.com>>)

4.16.1 / 2021-04-25
==================

**fixes**
  * [[`8666e9e`](http://github.com/eggjs/egg-bin/commit/8666e9eb9ce5016ac61af9f542b5518537a90a6b)] - fix: egginfo is not exists (#159) (吖猩 <<whxaxes@gmail.com>>)

4.16.0 / 2021-04-23
==================

**features**
  * [[`a74bae2`](http://github.com/eggjs/egg-bin/commit/a74bae2f604c13b50dadb8468a796867315120c7)] - feat: support switch ts compiler (#158) (吖猩 <<whxaxes@gmail.com>>)

4.15.0 / 2020-07-03
==================

**features**
  * [[`dcc9b25`](http://github.com/eggjs/egg-bin/commit/dcc9b256843815b6b4f1e505bfd1bf3aeffa4db0)] - feat: expose proc (#152) (TZ | 天猪 <<atian25@qq.com>>)

4.14.1 / 2020-01-02
==================

**fixes**
  * [[`00afdf7`](http://github.com/eggjs/egg-bin/commit/00afdf7e0237a42360ffd40513cb0b11467efbb5)] - fix: auto add .setup.ts file (#147) (angleshe <<478647464@qq.com>>)

4.14.0 / 2019-10-12
==================

**features**
  * [[`3cc3b0b`](http://github.com/eggjs/egg-bin/commit/3cc3b0bbc56553e66fdd3cc5b87716e61d859bdb)] - feat: test  --dry-run (#145) (Shu Pengfei <<stormslowly@gmail.com>>)

**fixes**
  * [[`9cb8125`](http://github.com/eggjs/egg-bin/commit/9cb812537f1bc5e046186fe4f167742503a43abb)] - fix: revert nyc (#140) (Haoliang Gao <<sakura9515@gmail.com>>)

**others**
  * [[`26c7b59`](http://github.com/eggjs/egg-bin/commit/26c7b599c18dee30215f1ffe35e9b6ab03cd3dd7)] - chore(deps): update typescript to "^3" (#144) (waiting <<waiting@xiaozhong.biz>>)
  * [[`979a1ae`](http://github.com/eggjs/egg-bin/commit/979a1aed424540451412a58e3181ae1e456a73f5)] - ci: fix timeout (#142) (waiting <<waiting@xiaozhong.biz>>)

4.13.2 / 2019-09-27
==================

**fixes**
  * [[`3b370ef`](http://github.com/eggjs/egg-bin/commit/3b370ef998b65e1a5f0390a7aa5f0fb4d2e96a7d)] - fix: nyc shim (#138) (dxd <<dxd_sjtu@outlook.com>>)

4.13.1 / 2019-04-28
==================

**others**
  * [[`3665b0d`](http://github.com/eggjs/egg-bin/commit/3665b0d030258283bf8aa150019ae6214c9c85eb)] - deps: cleanup & fix high severity vulnerability (#133) (ZYSzys <<17367077526@163.com>>)

4.13.0 / 2019-04-23
==================

**features**
  * [[`5c621f6`](http://github.com/eggjs/egg-bin/commit/5c621f6d6119fc0ac03b70e294e6cc18d2f88568)] - feat: should print error stack (#132) (TZ | 天猪 <<atian25@qq.com>>)

4.12.3 / 2019-04-09
==================

**fixes**
  * [[`819d78f`](http://github.com/eggjs/egg-bin/commit/819d78fb4d8a1c13827f0e64c197e129777fe646)] - fix: debug mode detect (#130) (TZ | 天猪 <<atian25@qq.com>>)

**others**
  * [[`f85aafb`](http://github.com/eggjs/egg-bin/commit/f85aafb8db6b5be1d1cf9cb88297747cafb96142)] - chore: update deps (#131) (TZ | 天猪 <<atian25@qq.com>>)

4.12.2 / 2019-04-04
==================

**fixes**
  * [[`3b6819c`](http://github.com/eggjs/egg-bin/commit/3b6819ccdc1f2f6c81482f45097adfe544e6c874)] - fix: should not timeout when debugging (#129) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`fcae123`](http://github.com/eggjs/egg-bin/commit/fcae1233518d094984aac0efe6890d679da533a0)] - fix: support --workers same as egg-scripts (#127) (TZ | 天猪 <<atian25@qq.com>>)

4.12.1 / 2019-03-26
==================

**fixes**
  * [[`d802694`](http://github.com/eggjs/egg-bin/commit/d802694cc1039e0b0a3721917019c63b7599d59e)] - fix: downgrade ts-node (#126) (吖猩 <<whxaxes@qq.com>>)

4.12.0 / 2019-03-20
==================

**others**
  * [[`44854f0`](http://github.com/eggjs/egg-bin/commit/44854f047823a0979b41bf7661e06be2dd5aef83)] - deps: bump ts-node version (#125) (吖猩 <<whxaxes@qq.com>>)

4.11.1 / 2019-03-06
==================

**fixes**
  * [[`8f6135e`](http://github.com/eggjs/egg-bin/commit/8f6135edf46584f009633fa82436ed16037f6cc5)] - fix: ets not found (#124) (吖猩 <<whxaxes@qq.com>>)

4.11.0 / 2019-02-15
===================

  * feat: intergration with egg-ts-helper (#123)

4.10.0 / 2019-01-04
===================

  **features**
    * [[`904103f`](https://github.com/eggjs/egg-bin/commit/904103fe673e93bdf600f6eace4121cf4bf15d9b)] - feat: support read egg.require from package.json (#121) (吖猩 <<whxaxes@qq.com>>)

  **docs**
    * [[`0d553f6`](https://github.com/eggjs/egg-bin/commit/0d553f641155bc3ee9cc9d459a0ddff238c6c691)] - docs: test timeout is 6000ms (#115) (BiosSun <<biossun@gmail.com>>)

4.9.0 / 2018-09-19
==================

**features**
  * [[`51f93aa`](http://github.com/eggjs/egg-bin/commit/51f93aaa7506c9d0b90e3385c5bb6fa2cb488bc0)] - feat: support egg-bin test --changed (#111) (Yiyu He <<dead_horse@qq.com>>)

**fixes**
  * [[`a82a87a`](http://github.com/eggjs/egg-bin/commit/a82a87a66939c327b65f394abd99a3d194c860bb)] - fix: debug-test invoke formatTestArgs (dead-horse <<dead_horse@qq.com>>)

4.8.5 / 2018-09-11
==================

  * feat: remove correct-source-map.js (#109)

4.8.4 / 2018-09-06
==================

  * fix: package.json to reduce vulnerabilities (#108)

4.8.3 / 2018-08-27
==================

**fixes**
  * [[`ca4f78f`](http://github.com/eggjs/egg-bin/commit/ca4f78f5e7c608fbe9af37577c62a5b64bb2b45c)] - fix: fix source map line number incorrect (#107) (吖猩 <<whxaxes@qq.com>>)

4.8.2 / 2018-08-23
==================

**features**
  * [[`35e89db`](http://github.com/eggjs/egg-bin/commit/35e89dbdbfcb6d2c6cd07f73145ead7c4c5421ce)] - feat: upgrade espower-typescript to 9.0 (#106) (吖猩 <<whxaxes@qq.com>>)

4.8.1 / 2018-08-01
==================

  * fix: fixed ts-node ignore files (#105)

4.8.0 / 2018-07-31
==================

  * chore: update deps (#104)
  * feat(cov): add nyc instrument passthrough (#103)

4.7.1 / 2018-06-29
==================

  * fix: should exit when no test files found (#100)

4.7.0 / 2018-04-18
==================

  * feat: add ts env in command (#98)

4.6.3 / 2018-04-05
==================

  * fix: should only read pkg if argv.typescript not pass (#97)

4.6.2 / 2018-04-02
==================

**fixes**
  * [[`e73c569`](http://github.com/eggjs/egg-bin/commit/e73c56952cdbd0f925e8aea1ad1b3098e9ccc90e)] - fix: should ignore fixtures and node_modules (#96) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`7531faa`](http://github.com/eggjs/egg-bin/commit/7531faaae98e126ec0151721a5fbf7a73b6246b3)] - fix: support relative path (#95) (TZ | 天猪 <<atian25@qq.com>>)

4.6.1 / 2018-03-31
==================

  * fix: remove ts extensions by default (#94)

4.6.0 / 2018-03-30
==================

  * chore: don't need to log at vscode and webstorm (#93)
  * feat: support egg.typescript (#92)
  * feat: cov support typescript (#91)

4.5.0 / 2018-03-28
==================

  * feat: support typescript (#89)
  * feat: set EGG_MASTER_CLOSE_TIMEOUT when run dev (#88)

4.4.1 / 2018-03-26
==================

  * feat: revert egg-bin check (#90)

4.4.0 / 2018-02-24
==================

  * feat: egg-bin check (#87)

4.3.7 / 2017-12-13
==================

**fixes**
  * [[`6689962`](http://github.com/eggjs/egg-bin/commit/6689962082fb86591adfcaf0d85687096cdb851d)] - fix: make sure files sort in all platforms (#86) (fengmk2 <<fengmk2@gmail.com>>)

4.3.6 / 2017-11-30
==================

  * deps: autod@3.0 (#85)
  * test: Node 8.7.0 has improved stack for promise (#84)

4.3.5 / 2017-10-10
==================

**fixes**
  * [[`7386194`](http://github.com/eggjs/egg-bin/commit/7386194d94ec8b0d0faee766fe98f0f4f2ece8a2)] - fix: force exit when runner complete (#83) (Haoliang Gao <<sakura9515@gmail.com>>)

**others**
  * [[`a7c4b53`](http://github.com/eggjs/egg-bin/commit/a7c4b53c3aab8ee4a7c3c65e39f6480de97a9ea1)] - chore: remove incorrect history (#82) (Haoliang Gao <<sakura9515@gmail.com>>)

4.3.4 / 2017-10-09
==================

Upgrade mocha@4, see https://boneskull.com/mocha-v4-nears-release

**fixes**
  * [[`e3c33e9`](http://github.com/eggjs/egg-bin/commit/e3c33e9fbc8c67ce733237ff7c0c41f35654712f)] - fix: package.json to reduce vulnerabilities (#81) (Snyk bot <<snyk-bot@users.noreply.github.com>>)


4.3.3 / 2017-09-21
==================

  * chore: dont print devtools link at vscode (#75)

4.3.2 / 2017-09-14
==================

**fixes**
  * [[`2e3498e`](http://github.com/eggjs/egg-bin/commit/2e3498e6ca1b81814a2d1a4db4a8a37fb0d6d880)] - fix: use inspector at 7.x+ (#74) (TZ | 天猪 <<atian25@qq.com>>)

4.3.1 / 2017-09-13
==================

**features**
  * [[`678b83d`](http://github.com/eggjs/egg-bin/commit/678b83d64ad850ac390607ee281e5336473da808)] - feat: debug proxy support (TZ <<atian25@qq.com>>)
  * [[`c65a00d`](http://github.com/eggjs/egg-bin/commit/c65a00dc69fbca3924bcd848c94bc0b11a3ee17a)] - feat: revert to 4.2.0 (TZ <<atian25@qq.com>>)

**fixes**
  * [[`469739f`](http://github.com/eggjs/egg-bin/commit/469739f1b494c647fcb06e0db432d435ed9e1805)] - fix: debug at 6.x (TZ <<atian25@qq.com>>)

**others**
  * [[`2be5245`](http://github.com/eggjs/egg-bin/commit/2be52459ed22dd3c0a22b080f7e29ae876d2914f)] - docs: add readme (TZ <<atian25@qq.com>>)
  * [[`3e8ce0d`](http://github.com/eggjs/egg-bin/commit/3e8ce0d3aaaea793f466b768f45f77e4fcc7b001)] - refactor: use common-bin parse execArgv (TZ <<atian25@qq.com>>)

4.3.0 / 2017-09-07
==================

**others**
  * [[`83afba3`](http://github.com/eggjs/egg-bin/commit/83afba3a43e9e7d233263f6deba792d1f4c1a1d9)] - deps: update common-bin (TZ <<atian25@qq.com>>)
  * [[`f7628b2`](http://github.com/eggjs/egg-bin/commit/f7628b22042168d522b9b69344c9a54ab1fa1305)] - refactor: egg-bin debug pass debugOptions to startCluster (TZ <<atian25@qq.com>>)
  * [[`831c77d`](http://github.com/eggjs/egg-bin/commit/831c77d3d0a269e1ab1243471ef34bb53df0fb80)] - refactor: use common-bin parse execArgv (TZ <<atian25@qq.com>>)

4.2.0 / 2017-08-30
==================

  * feat: support $NODE_DEBUG_OPTION (#71)

4.1.0 / 2017-08-02
==================

  * feat: add `egg-bin autod --check` command (#70)

4.0.5 / 2017-07-05
==================

  * fix: only hotfix spawn-wrap on windows (#69)

4.0.4 / 2017-06-21
==================

  * fix: remove temp excludes
  * feat(cov): add prerequire option (#53)

4.0.3 / 2017-06-21
==================

  * fix: There is a case sensitive issue from spawn-wrap  on Windows (#67)

4.0.2 / 2017-06-20
==================

  * fix: should support multi exclude dirs (#66)

4.0.1 / 2017-06-20
==================

  * fix: ignore frontend files and document files (#65)

4.0.0 / 2017-06-20
==================

  * feat: use nyc instead of istanbul (#63)

3.7.0 / 2017-06-19
==================

  * feat: cov support output json-summary (#64)

3.6.0 / 2017-06-14
==================

  * feat: support cov command  in win32 (#52)
  * test: skip assert error stack on node >= 7.0.0 (#61)
  * fix: clean more mocha error stack (#60)

3.5.0 / 2017-06-08
==================

  * feat: simplify mocha error stack (#59)

3.4.2 / 2017-06-04
==================

  * fix: use context.env instead of process.env (#58)

3.4.1 / 2017-06-01
==================

  * fix: don't pass prerequire (#57)

3.4.0 / 2017-05-18
==================

  * feat(cov): add prerequire option (#53)

3.3.2 / 2017-04-28
==================

  * feat: change default timeout to 60000 (#50)

3.3.1 / 2017-04-25
==================

  * fix: cov replaced warning at win (#49)

3.3.0 / 2017-04-17
==================

  * feat: pass --check to pkgfiles (#48)

3.2.1 / 2017-04-01
==================

  * fix: -x only support string (#47)

3.2.0 / 2017-03-29
==================

  * feat: extractArgv refactor & extract debug port
  * feat: extractArgv support expose_debug_as

3.1.0 / 2017-03-21
==================

  * feat: use unparseArgv from common-bin (#45)

3.0.1 / 2017-03-21
==================

  * fix(cov): istanbul path env (#44)

3.0.0 / 2017-03-21
==================

  * refactor: [BREAKING_CHANGE] use common-bin 2.x (#41)

2.4.0 / 2017-03-09
==================

  * deps: upgrade istanbul to 1.1.0-alpha.1 (#43)

2.3.0 / 2017-03-08
==================

  * fix: add missing deps (#42)
  * feat: update pkg.files that if file exists (#37)
  * refactor: use framework (#39)

2.2.3 / 2017-02-25
==================

  * fix: support egg-bin dev --cluster and --baseDir (#36)

2.2.2 / 2017-02-25
==================

  * fix: use co-mocha instead of thunk-mocha (#38)

2.2.1 / 2017-02-19
==================

  * fix: support node4 (#35)

2.2.0 / 2017-02-15
==================

  * feat: commands support specific execArgv(harmony) (#33)
  * docs: missing debug description for zh-cn (#34)

2.1.0 / 2017-02-14
==================

  * feat: add sticky mode support (#32)

2.0.2 / 2017-01-24
==================

  * fix: .setup.js should be the first test file (#30)

2.0.1 / 2017-01-17
==================

  * fix: should support -p (#27)
  * docs: use V8 Inspector Integration for debug

2.0.0 / 2017-01-16
==================

  * feat(debug): [BREAKING_CHANGE] remove iron-node (#26)

1.10.1 / 2017-01-16
==================

  * fix: should pass customEgg to startCluster (#25)

1.10.0 / 2016-12-28
==================

  * feat: auto require setup file (#24)

1.9.1 / 2016-12-16
==================

  * fix: make sure dev command eggPath can be override (#23)

1.9.0 / 2016-12-16
==================

  * feat: auto detect available port (#22)

1.8.1 / 2016-12-14
==================

  * fix: add power-assert to deps (#21)

1.8.0 / 2016-12-14
==================

  * feat: build-in intelli-espower-loader (#20)

1.7.0 / 2016-11-03
==================

  * feat: try to use --inspect first (#19)

1.6.0 / 2016-10-28
==================

  * feat: use test when run cov on Windows (#18)

1.5.3 / 2016-10-28
==================

  * fix: wait more time for Window :cry: (#17)

1.5.2 / 2016-10-26
==================

  * fix(cov): wait 1 second for Windows (#16)

1.5.1 / 2016-10-20
==================

  * fix: link mocha bin from inner file (#15)
  * docs:add egg-bin dev options doc (#14)

1.5.0 / 2016-10-16
==================

  * test: exports mocha bin (#13)

1.4.0 / 2016-09-29
==================

  * feat(dev): pass debug args to execArgv (#12)

1.3.0 / 2016-08-19
==================

  * feat: resolve istanbul path for coffee (#9)

1.2.1 / 2016-08-18
==================

  * fix: can not find iron-node in subprocess (#8)

1.2.0 / 2016-08-04
==================

  * feat: add COV_EXCLUDES for coverage excludes (#7)

1.1.1 / 2016-08-03
==================

  * chore(deps): upgrade mocha@3 and glob@7 (#6)

1.1.0 / 2016-07-29
==================

  * feat: support mocha custom require args (#5)
  * refactor: use common-bin (#4)

1.0.2 / 2016-07-12
==================

  * refactor: rename DevCommand.js to dev_command.js (#3)
  * chore: add security check badge (#2)
  * refactor: use egg-utils (#1)

1.0.1 / 2016-06-20
==================

  * fix: let sub class can override getFrameworkOrEggPath

1.0.0 / 2016-06-19
==================

  * init version
