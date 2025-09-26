# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## 6.0.0+


### ⚠ BREAKING CHANGES
* drop Node.js < 20.19.0 support


## [5.0.2](https://github.com/eggjs/schedule/compare/v5.0.1...v5.0.2) (2024-12-20)


### Bug Fixes

* import cron-parser default ([#64](https://github.com/eggjs/schedule/issues/64)) ([a368c5a](https://github.com/eggjs/schedule/commit/a368c5a63273d500ef660ca641019e5d1a5e07a9))

## [5.0.1](https://github.com/eggjs/egg-schedule/compare/v5.0.0...v5.0.1) (2024-12-17)


### Bug Fixes

* patch runSchedule on application.unittest.ts ([#63](https://github.com/eggjs/egg-schedule/issues/63)) ([cc9488c](https://github.com/eggjs/egg-schedule/commit/cc9488c12c64fac2962825b58537445bb91489a8))

## [5.0.0](https://github.com/eggjs/egg-schedule/compare/v4.0.1...v5.0.0) (2024-12-17)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
- Introduced a new `Boot` class for managing agent lifecycle and
scheduling.
- Added `Schedule` and `ScheduleWorker` classes for managing scheduled
tasks.
- Implemented `AllStrategy` and `WorkerStrategy` classes for scheduling
strategies.
- Added TypeScript support with updated interfaces and types for
scheduling functionality.

- **Bug Fixes**
- Updated changelog to reflect a bug fix ensuring schedules execute
after the application is ready.

- **Documentation**
	- Updated `README.md` to reflect package renaming and TypeScript usage.
	- Enhanced documentation with new sections and improved formatting.

- **Chores**
- Removed outdated files and configurations related to previous
implementations.
- Transitioned project to TypeScript with updated configurations and
module syntax.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#62](https://github.com/eggjs/egg-schedule/issues/62)) ([04742eb](https://github.com/eggjs/egg-schedule/commit/04742eb2bdb8ff995029bdf912fc7c5de9a9dca8))

## [4.0.1](https://github.com/eggjs/egg-schedule/compare/v4.0.0...v4.0.1) (2024-03-06)


### Bug Fixes

* schedule should execute after app ready ([#60](https://github.com/eggjs/egg-schedule/issues/60)) ([bf01a49](https://github.com/eggjs/egg-schedule/commit/bf01a49b093b4a32ee546b64be3059f0dbe65572))

---


4.0.0 / 2022-12-11
==================

**features**
  * [[`66e7aeb`](http://github.com/eggjs/egg-schedule/commit/66e7aeb87dfc8994529ec9d8407a219461345d27)] - 📦 NEW: [BREAKING] Support localStorage to run task (#58) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`7672269`](http://github.com/eggjs/egg-schedule/commit/7672269168f2a19a5e239fc58e625b32f89693cc)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)
  * [[`bab8585`](http://github.com/eggjs/egg-schedule/commit/bab8585a64dbc7d7c0ff1c1b88b5dc544b9e8aac)] - ci: del appveyor (#57) (killa <<killa123@126.com>>)

3.7.0 / 2022-09-03
==================

**features**
  * [[`ca8b92b`](http://github.com/eggjs/egg-schedule/commit/ca8b92be7e72f3b35e80d8812d378f822f7a02b2)] - feat: add api for register/unregister schedule (#56) (killa <<killa123@126.com>>)

3.6.6 / 2020-10-23
==================

**fixes**
  * [[`3a8ef55`](http://github.com/eggjs/egg-schedule/commit/3a8ef55ff3da580f277755fdb0cca15a12fc2256)] - fix: runSchedule get filePath keep same logic with loader (#55) (mansonchor.github.com <<mansonchor@126.com>>)

**others**
  * [[`39f4aad`](http://github.com/eggjs/egg-schedule/commit/39f4aadf1f10736a4fa3cedd779a48cb329d5320)] - docs: updated README with grammatical and spelling fixes (#54) (Hridayesh Sharma <<vyasriday7@gmail.com>>)

3.6.5 / 2020-09-01
==================

**fixes**
  * [[`7ee8cb3`](http://github.com/eggjs/egg-schedule/commit/7ee8cb3696751ca30bbc3abfb3cbc06a676d2fe7)] - fix: only reject/error detect as fail (#53) (TZ | 天猪 <<atian25@qq.com>>)

**others**
  * [[`0425031`](http://github.com/eggjs/egg-schedule/commit/0425031279bc98a716671111e3f36bdd0a353017)] - docs: add module exports for custom schedule in document (#52) (Cheng Ju Wu <<sam19970416@gmail.com>>)
  * [[`7da04fe`](http://github.com/eggjs/egg-schedule/commit/7da04fe5b3adfd572375b02f1063b8d90684743e)] - chore: Update README.md (#51) (Cheng Ju Wu <<sam19970416@gmail.com>>)
  * [[`13f03b8`](http://github.com/eggjs/egg-schedule/commit/13f03b8681d60dfa8c9d33574cef392dc55c4b27)] - chore: Update .travis.yml (#50) (TZ | 天猪 <<atian25@qq.com>>)

3.6.4 / 2019-06-12
==================

**fixes**
  * [[`b6b17b0`](http://github.com/eggjs/egg-schedule/commit/b6b17b032582dbde6f4f9faecef3dd662726b3e2)] - fix: should use template literal (#49) (Jedmeng <<roy.urey@gmail.com>>)

3.6.3 / 2019-06-03
==================

**fixes**
  * [[`bce393f`](http://github.com/eggjs/egg-schedule/commit/bce393f66f70add9151155d16b90942bab75e89b)] - fix: wrap task should always return promise (#48) (TZ | 天猪 <<atian25@qq.com>>)

3.6.2 / 2019-04-29
==================

**fixes**
  * [[`98a0cf7`](http://github.com/eggjs/egg-schedule/commit/98a0cf78012bd138cd8b0893c1acb6527cfecf0e)] - fix: runSchedule should pass args (#47) (TZ | 天猪 <<atian25@qq.com>>)

**others**
  * [[`77fc7d3`](http://github.com/eggjs/egg-schedule/commit/77fc7d3b46d1c57acc69cb3931241f9cb8165a38)] - docs: fix ctx ref (#46) (祝传鹏 <<Luomusha@gmail.com>>)

3.6.1 / 2019-03-20
==================

**others**
  * [[`0960ff8`](http://github.com/eggjs/egg-schedule/commit/0960ff8f058c2bbb8ad2afb333bc557d719ec99b)] - chore: use relative log path (#45) (TZ | 天猪 <<atian25@qq.com>>)

3.6.0 / 2018-12-18
==================

**features**
  * [[`2c64d3c`](https://github.com/eggjs/egg-schedule/commit/2c64d3c6dd386dedaa784180ebb6c61b89fd1d53)] - feat: support custom directory (#43) (TZ <<atian25@qq.com>>)

3.5.0 / 2018-12-05
==================

**features**
  * [[`1aaf2d5`](http://github.com/eggjs/egg-schedule/commit/1aaf2d5675253d125eacca8bfd77813ecc151d2a)] - feat: support custom directory (#43) (Haoliang Gao <<sakura9515@gmail.com>>)

**fixes**
  * [[`4dbf9d9`](http://github.com/eggjs/egg-schedule/commit/4dbf9d9d3785b19eb772704c724c421e1017922a)] - fix: unit-test in 'schedule.test.js' (#41) (Maledong <<maledong_github@outlook.com>>)

**others**
  * [[`571bf9f`](http://github.com/eggjs/egg-schedule/commit/571bf9f28ed229f957fa70067786061a89dc1049)] - doc: Add notice for the evil 'setInterval' (#42) (Maledong <<maledong_github@outlook.com>>)
  * [[`07e4e23`](http://github.com/eggjs/egg-schedule/commit/07e4e238f198fbf935ac5e7fff279f349e11a6b5)] - docs: fix example in readme (cwtuan <<cwtuan@users.noreply.github.com>>)

3.4.0 / 2018-06-30
==================

**features**
  * [[`417a764`](http://github.com/eggjs/egg-schedule/commit/417a7643807e56a432703e64f76923b60e1053ba)] - feat: support `schedule.env` (#39) (TZ | 天猪 <<atian25@qq.com>>)

3.3.0 / 2018-02-24
==================

  * feat: optimize logger msg (#38)

3.2.1 / 2018-02-07
==================

  * chore: fix doctools (#37)

3.2.0 / 2018-02-06
==================

**features**
  * [[`2003369`](http://github.com/eggjs/egg-schedule/commit/200336963cdf2404b926fa1c36223c41229cf32d)] - feat: egg-schedule.log && support send with args (#35) (TZ | 天猪 <<atian25@qq.com>>)

3.1.1 / 2017-11-20
==================

**fixes**
  * [[`9ff3974`](http://github.com/eggjs/egg-schedule/commit/9ff3974683e1f4ade72ccbe2448a3c68d7826530)] - fix: use ctx.coreLogger to record schedule log (#34) (Yiyu He <<dead_horse@qq.com>>)

3.1.0 / 2017-11-16
==================

**features**
  * [[`69a588e`](https://github.com/eggjs/egg-schedule/commit/69a588e5ffbb5a01ed3084bfb9f6c2a792963db4)] - feat: run a scheduler only once at startup (#33) (zhennann <<zhen.nann@icloud.com>>)

3.0.0 / 2017-11-10
==================

**others**
  * [[`925f1c3`](http://github.com/eggjs/egg-schedule/commit/925f1c38ffb5c8d73e91fe96e6e7fc30c3f43c5f)] - refactor: remove old stype strategy support [BREAKING CHANGE] (#29) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`4cdfa20`](http://github.com/eggjs/egg-schedule/commit/4cdfa204f1da36288328bf30acb0564da1e3d1b5)] - test: change to extend Subscription (#28) (TZ | 天猪 <<atian25@qq.com>>)

2.6.0 / 2017-10-16
==================

**features**
  * [[`f901df4`](http://github.com/eggjs/egg-schedule/commit/f901df4e895d440c9d3bc96e172d3cc87be95255)] - feat: Strategy interface change to start() (#26) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`c7816f2`](http://github.com/eggjs/egg-schedule/commit/c7816f2eb8ca668c92c1671b1d149c78dd73551e)] - feat: support class (#25) (Haoliang Gao <<sakura9515@gmail.com>>)

**others**
  * [[`8797489`](http://github.com/eggjs/egg-schedule/commit/8797489f914a34bf56ecc68575b0b7e490628b5a)] - docs: use subscription (#27) (Haoliang Gao <<sakura9515@gmail.com>>)

2.5.1 / 2017-10-11
==================

  * fix: publish files (#24)

2.5.0 / 2017-10-11
==================

  * refactor: classify (#23)
  * test: sleep after runSchedule (#22)

2.4.1 / 2017-06-06
==================

  * fix: use safe-timers only large than interval && add tests (#21)

2.4.0 / 2017-06-05
==================

  * feat: use safe-timers to support large delay (#19)

2.3.1 / 2017-06-04
==================

  * docs: fix License url (#20)
  * test: fix test on windows (#18)
  * chore: upgrade all deps (#17)

2.3.0 / 2017-02-08
==================

  * feat: task support async function (#13)
  * test: move app.close to afterEach (#12)
  * chore: upgrade deps and fix test (#11)

2.2.1 / 2016-10-25
==================

  * fix: start schedule after egg-ready (#10)

2.2.0 / 2016-09-29
==================

  * feat: export app.schedules (#9)
  * doc:fix plugin.js config demo (#8)

2.1.0 / 2016-08-18
==================

  * refactor: use FileLoader to load schedule files (#7)

2.0.0 / 2016-08-16
==================

  * Revert "Release 1.1.1"
  * refactor: use loader.getLoadUnits from egg-core (#6)

1.1.0 / 2016-08-15
==================

  * docs: add readme (#5)
  * feat: support immediate (#4)

1.0.0 / 2016-08-10
==================

  * fix: correct path in ctx (#3)

0.1.0 / 2016-07-26
==================

  * fix: use absolute path for store key (#2)
  * test: add test cases (#1)

0.0.1 / 2016-07-15
==================

  * init
