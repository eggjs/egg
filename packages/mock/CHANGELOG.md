# Changelog

## [6.0.7](https://github.com/eggjs/mock/compare/v6.0.6...v6.0.7) (2025-02-08)


### Bug Fixes

* app.mockContext() should return egg context instance ([#186](https://github.com/eggjs/mock/issues/186)) ([940f321](https://github.com/eggjs/mock/commit/940f321abd2f46b4ea795761e0a420c280003b01))

## [6.0.6](https://github.com/eggjs/mock/compare/v6.0.5...v6.0.6) (2025-02-04)


### Bug Fixes

* type defines ([#185](https://github.com/eggjs/mock/issues/185)) ([df4208c](https://github.com/eggjs/mock/commit/df4208c1c4ead35ee0d46d4e95a3ef11083b19c8))

## [6.0.5](https://github.com/eggjs/mock/compare/v6.0.4...v6.0.5) (2025-01-02)


### Bug Fixes

* remove ContextDelegation ([#183](https://github.com/eggjs/mock/issues/183)) ([f4051d0](https://github.com/eggjs/mock/commit/f4051d03e45f2a4a55e5294a74e6b254200260e9))

## [6.0.4](https://github.com/eggjs/mock/compare/v6.0.3...v6.0.4) (2025-01-01)


### Bug Fixes

* add startMode types ([#182](https://github.com/eggjs/mock/issues/182)) ([c9b8aca](https://github.com/eggjs/mock/commit/c9b8aca67aef8e79f61ab3c2451aee7314d1b353))

## [6.0.3](https://github.com/eggjs/mock/compare/v6.0.2...v6.0.3) (2024-12-29)


### Bug Fixes

* add urllib to dependencies ([#181](https://github.com/eggjs/mock/issues/181)) ([d56e49d](https://github.com/eggjs/mock/commit/d56e49d3ad6a6f5b2c3f9f7405de71d8afe10615))

## [6.0.2](https://github.com/eggjs/mock/compare/v6.0.1...v6.0.2) (2024-12-29)


### Bug Fixes

* set bootstrap app to global ([#180](https://github.com/eggjs/mock/issues/180)) ([4e1525c](https://github.com/eggjs/mock/commit/4e1525ced57d2596058ca102e66baf2f43f12e4f))

## [6.0.1](https://github.com/eggjs/mock/compare/v6.0.0...v6.0.1) (2024-12-29)


### Bug Fixes

* support simple test on normal app ([#179](https://github.com/eggjs/mock/issues/179)) ([3b0957f](https://github.com/eggjs/mock/commit/3b0957fd33a638d8c505dd09ba47323f1d006a8a))

## [6.0.0](https://github.com/eggjs/mock/compare/v5.15.1...v6.0.0) (2024-12-29)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

### Features

* support cjs and esm both by tshy ([#178](https://github.com/eggjs/mock/issues/178)) ([674b1ca](https://github.com/eggjs/mock/commit/674b1ca2d3b2d978ca8176b46b03a0f53f65939a))

## [5.15.1](https://github.com/eggjs/egg-mock/compare/v5.15.0...v5.15.1) (2024-12-12)


### Bug Fixes

* try to use urllib4 ([#177](https://github.com/eggjs/egg-mock/issues/177)) ([c8551b9](https://github.com/eggjs/egg-mock/commit/c8551b98f044c7315a67f579cc2c1b4f5dde73c4))

## [5.15.0](https://github.com/eggjs/egg-mock/compare/v5.14.0...v5.15.0) (2024-12-10)


### Features

* use @eggjs/utils ([#176](https://github.com/eggjs/egg-mock/issues/176)) ([48000cb](https://github.com/eggjs/egg-mock/commit/48000cb468fd25ac258d728ecc9afca21a8f6284))

## [5.14.0](https://github.com/eggjs/egg-mock/compare/v5.13.0...v5.14.0) (2024-12-09)


### Features

* detect-port@2, is-type-of@2, get-ready@3 ([#175](https://github.com/eggjs/egg-mock/issues/175)) ([0364af8](https://github.com/eggjs/egg-mock/commit/0364af8d87237bc6c08e2f9306945daa1d9144c9))

## [5.13.0](https://github.com/eggjs/egg-mock/compare/v5.12.5...v5.13.0) (2024-12-07)


### Features

* mv urllib to peerDependencies ([#174](https://github.com/eggjs/egg-mock/issues/174)) ([df7dc48](https://github.com/eggjs/egg-mock/commit/df7dc48be38f7f323f91213aa3ce3bd5e7879a58))

## [5.12.5](https://github.com/eggjs/egg-mock/compare/v5.12.4...v5.12.5) (2024-07-05)


### Bug Fixes

* should run restore in the current event loop ([#172](https://github.com/eggjs/egg-mock/issues/172)) ([1f9fc01](https://github.com/eggjs/egg-mock/commit/1f9fc0179ac524cbeb0532b92783233c0274ce71))

## [5.12.4](https://github.com/eggjs/egg-mock/compare/v5.12.3...v5.12.4) (2024-07-04)


### Bug Fixes

* should reset agent on restore ([#171](https://github.com/eggjs/egg-mock/issues/171)) ([088ac41](https://github.com/eggjs/egg-mock/commit/088ac41d96daecf62c544ca954812d3721ac06cc))

## [5.12.3](https://github.com/eggjs/egg-mock/compare/v5.12.2...v5.12.3) (2024-07-02)


### Bug Fixes

* don't close used mock agent ([#170](https://github.com/eggjs/egg-mock/issues/170)) ([3e7a504](https://github.com/eggjs/egg-mock/commit/3e7a5044e3a687c8accbfc9f8a60c469bf4fdad6))

## [5.12.2](https://github.com/eggjs/egg-mock/compare/v5.12.1...v5.12.2) (2024-07-02)


### Bug Fixes

* export mockHttpClient types ([#169](https://github.com/eggjs/egg-mock/issues/169)) ([ddab25f](https://github.com/eggjs/egg-mock/commit/ddab25f1b06e1e513c2dd523bf7d773970d37031))

## [5.12.1](https://github.com/eggjs/egg-mock/compare/v5.12.0...v5.12.1) (2024-07-02)


### Bug Fixes

* support httpclient mock on allowH2 = true ([#168](https://github.com/eggjs/egg-mock/issues/168)) ([3a434bb](https://github.com/eggjs/egg-mock/commit/3a434bb6a90c98b957b6d92e059c09297bf7cf18))

## [5.12.0](https://github.com/eggjs/egg-mock/compare/v5.11.0...v5.12.0) (2024-06-02)


### Features

* change backgroundTasksFinished method from private to public ([#163](https://github.com/eggjs/egg-mock/issues/163)) ([86b4d45](https://github.com/eggjs/egg-mock/commit/86b4d452f0e5e851e8fd550a74f244c91de5c093))

## [5.11.0](https://github.com/eggjs/egg-mock/compare/v5.10.9...v5.11.0) (2024-06-02)


### Features

* use egg-logger@3 and sdk-base@4 ([#167](https://github.com/eggjs/egg-mock/issues/167)) ([e02e72e](https://github.com/eggjs/egg-mock/commit/e02e72ef561ae029be3671ebf2a8e37ad06dc2d1))

## [5.10.9](https://github.com/eggjs/egg-mock/compare/v5.10.8...v5.10.9) (2023-11-08)


### Bug Fixes

* allow to call mockHttpclient multi times ([#165](https://github.com/eggjs/egg-mock/issues/165)) ([370e42d](https://github.com/eggjs/egg-mock/commit/370e42d777d89dcfde1773db6404284439b38725))

## [5.10.8](https://github.com/eggjs/egg-mock/compare/v5.10.7...v5.10.8) (2023-06-21)


### Bug Fixes

* fix mocha failed title for inject_ctx ([#162](https://github.com/eggjs/egg-mock/issues/162)) ([f6f59ac](https://github.com/eggjs/egg-mock/commit/f6f59ac48789fb2c81dfd3025b626c2ed4090a36))

## [5.10.7](https://github.com/eggjs/egg-mock/compare/v5.10.6...v5.10.7) (2023-05-29)


### Bug Fixes

* set types to index.d.ts ([#161](https://github.com/eggjs/egg-mock/issues/161)) ([7de47a1](https://github.com/eggjs/egg-mock/commit/7de47a1e6bb8d4d003b93c130d1e08c7ac0c8bf7))

## [5.10.6](https://github.com/eggjs/egg-mock/compare/v5.10.5...v5.10.6) (2023-02-22)


### Bug Fixes

* disable app close on parallel ([#160](https://github.com/eggjs/egg-mock/issues/160)) ([5a08d33](https://github.com/eggjs/egg-mock/commit/5a08d33ffcbc047ef374a5ab99bee00ad5675808))

## [5.10.5](https://github.com/eggjs/egg-mock/compare/v5.10.4...v5.10.5) (2023-02-16)


### Bug Fixes

* should close app on afterAll hook ([#158](https://github.com/eggjs/egg-mock/issues/158)) ([081b157](https://github.com/eggjs/egg-mock/commit/081b1574c31cfe274083b21a1e11bc81304ab1d5))

## [5.10.4](https://github.com/eggjs/egg-mock/compare/v5.10.3...v5.10.4) (2023-01-31)


### Bug Fixes

* use symbol to access suite app ([#156](https://github.com/eggjs/egg-mock/issues/156)) ([a130dd3](https://github.com/eggjs/egg-mock/commit/a130dd307258df540b65b6d445b56681f69d9232))

## [5.10.3](https://github.com/eggjs/egg-mock/compare/v5.10.2...v5.10.3) (2023-01-30)


### Bug Fixes

* inject failed should make suite/test failed ([#154](https://github.com/eggjs/egg-mock/issues/154)) ([f9f2d4c](https://github.com/eggjs/egg-mock/commit/f9f2d4c5184b2fd2a60485d9333bfefb2c42fabb))

## [5.10.2](https://github.com/eggjs/egg-mock/compare/v5.10.1...v5.10.2) (2023-01-30)


### Bug Fixes

* make sure app ready on parallel mode ([#155](https://github.com/eggjs/egg-mock/issues/155)) ([83c600e](https://github.com/eggjs/egg-mock/commit/83c600e8cb8139a232f1066c2925562574102dbe))

## [5.10.1](https://github.com/eggjs/egg-mock/compare/v5.10.0...v5.10.1) (2023-01-29)


### Bug Fixes

* fix mockContext with headers ([#153](https://github.com/eggjs/egg-mock/issues/153)) ([5e3e816](https://github.com/eggjs/egg-mock/commit/5e3e816395d8be37548d4bb72c3e3dc2d098bee1))

## [5.10.0](https://github.com/eggjs/egg-mock/compare/v5.9.4...v5.10.0) (2023-01-28)


### Features

* add default ua egg-mock/${version} ([#151](https://github.com/eggjs/egg-mock/issues/151)) ([ccb28f5](https://github.com/eggjs/egg-mock/commit/ccb28f5a99148528459f1f8b120254f3feb64561))
* impl setGetAppCallback ([#152](https://github.com/eggjs/egg-mock/issues/152)) ([b7d902c](https://github.com/eggjs/egg-mock/commit/b7d902cf990ee90181f24e9722f42560858118eb))

## [5.9.4](https://github.com/eggjs/egg-mock/compare/v5.9.3...v5.9.4) (2023-01-18)


### Bug Fixes

* use originalUrl to check mock call function request ([#149](https://github.com/eggjs/egg-mock/issues/149)) ([abe1c07](https://github.com/eggjs/egg-mock/commit/abe1c07a2abb4b98c37a34725e4917caafe6dc7e))

## [5.9.3](https://github.com/eggjs/egg-mock/compare/v5.9.2...v5.9.3) (2023-01-18)


### Bug Fixes

* every it should has self ctx ([#150](https://github.com/eggjs/egg-mock/issues/150)) ([bf33c1c](https://github.com/eggjs/egg-mock/commit/bf33c1cbde00b0f10d49184bda305c2c98a58401))

## [5.9.2](https://github.com/eggjs/egg-mock/compare/v5.9.1...v5.9.2) (2023-01-17)


### Bug Fixes

* mocha should be peer deps ([#148](https://github.com/eggjs/egg-mock/issues/148)) ([9a5fcca](https://github.com/eggjs/egg-mock/commit/9a5fcca1ff19f2bc7d74a8122becc1bf0ddfe89d))

## [5.8.4](https://github.com/eggjs/egg-mock/compare/v5.8.3...v5.8.4) (2023-01-12)


### Bug Fixes

* only await app ready when app exists ([#145](https://github.com/eggjs/egg-mock/issues/145)) ([f4ed458](https://github.com/eggjs/egg-mock/commit/f4ed458441449da70fd4108747377b7890dc08fb))

## [5.8.3](https://github.com/eggjs/egg-mock/compare/v5.8.2...v5.8.3) (2023-01-11)


### Bug Fixes

* app should wait for agent ready on parallel mode ([#144](https://github.com/eggjs/egg-mock/issues/144)) ([205e836](https://github.com/eggjs/egg-mock/commit/205e836ba11a869da208c441a9b90edd6e61b3b1))

## [5.8.2](https://github.com/eggjs/egg-mock/compare/v5.8.1...v5.8.2) (2023-01-10)


### Bug Fixes

* ignore bootstrap error on non egg project ([#142](https://github.com/eggjs/egg-mock/issues/142)) ([880c282](https://github.com/eggjs/egg-mock/commit/880c282481024005456074a123b4b1f185971f4c))

## [5.8.1](https://github.com/eggjs/egg-mock/compare/v5.8.0...v5.8.1) (2023-01-09)


### Bug Fixes

* add register.js to files ([#141](https://github.com/eggjs/egg-mock/issues/141)) ([a87e801](https://github.com/eggjs/egg-mock/commit/a87e8019724dbb2401bd41ccf95be26c571e8e8f))

## [5.8.0](https://github.com/eggjs/egg-mock/compare/v5.7.1...v5.8.0) (2023-01-09)


### Features

* use mocha global hook to register before/after ([#140](https://github.com/eggjs/egg-mock/issues/140)) ([9ef65de](https://github.com/eggjs/egg-mock/commit/9ef65de3382c15c5fdeff2e8d0b14eed8144a41b))

## [5.7.1](https://github.com/eggjs/egg-mock/compare/v5.7.0...v5.7.1) (2023-01-07)


### Bug Fixes

* should add egg to peerDependencies ([#139](https://github.com/eggjs/egg-mock/issues/139)) ([2134fc7](https://github.com/eggjs/egg-mock/commit/2134fc73661e4c2de433aceda2ea45811c8bff8b))

## [5.7.0](https://github.com/eggjs/egg-mock/compare/v5.6.0...v5.7.0) (2023-01-03)


### Features

* remove power-assert ([#138](https://github.com/eggjs/egg-mock/issues/138)) ([0c9fad2](https://github.com/eggjs/egg-mock/commit/0c9fad2f7a6f739080f2b996d8f6bb98852af12a))

## [5.6.0](https://github.com/eggjs/egg-mock/compare/v5.5.0...v5.6.0) (2023-01-03)


### Features

* upgrade globby to v11 ([#137](https://github.com/eggjs/egg-mock/issues/137)) ([b0af3eb](https://github.com/eggjs/egg-mock/commit/b0af3eb471a394448236e4cb18863e60218e0d2a))

## [5.5.0](https://github.com/eggjs/egg-mock/compare/v5.4.0...v5.5.0) (2022-12-28)


### Features

* add mockContextScope ([#136](https://github.com/eggjs/egg-mock/issues/136)) ([9db9afa](https://github.com/eggjs/egg-mock/commit/9db9afaadfb73a58d03b3cbdbd0c8c6515e6578a))

---


5.4.0 / 2022-12-14
==================

**features**
  * [[`0bd71bc`](http://github.com/eggjs/egg-mock/commit/0bd71bc732b430f679854cceb5017238aca67f38)] - 📦 NEW: Allow restore mockAgent only (#134) (fengmk2 <<fengmk2@gmail.com>>)

5.3.0 / 2022-12-09
==================

**features**
  * [[`6608f01`](http://github.com/eggjs/egg-mock/commit/6608f01983b6891fad2eea758e426bb205dff117)] - 📦 NEW: mock context support ctxStorage (#133) (fengmk2 <<fengmk2@gmail.com>>)

5.2.1 / 2022-11-11
==================

**fixes**
  * [[`18c366d`](http://github.com/eggjs/egg-mock/commit/18c366d4d8f110e8b5e166bb4109be6659f59dd2)] - fix: use global hook for register global hook (#132) (killa <<killa123@126.com>>)

5.2.0 / 2022-11-08
==================

**features**
  * [[`209c921`](http://github.com/eggjs/egg-mock/commit/209c921cd07eeb541793d5eb28a4982c891ef337)] - feat: add EGG_FRAMEWORK for bootstrap custom framework (#131) (killa <<killa123@126.com>>)

5.1.0 / 2022-11-04
==================

**features**
  * [[`22f508c`](http://github.com/eggjs/egg-mock/commit/22f508cba2f6330172db89efde3a678ed35c5258)] - feat: impl parallel app for mocha parallel mode (#130) (killa <<killa123@126.com>>)

5.0.2 / 2022-10-09
==================

**fixes**
  * [[`299f7ec`](http://github.com/eggjs/egg-mock/commit/299f7ecc7314737c182c1745fce0d32c61cd657d)] - 🐛 FIX: Should use urllib-next package (#129) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`17a6713`](http://github.com/eggjs/egg-mock/commit/17a6713663555f55832c12fa12c68803a59aa925)] - 🤖 TEST: Add httpclient streaming mocking (#128) (fengmk2 <<fengmk2@gmail.com>>)

5.0.1 / 2022-09-29
==================

**features**
  * [[`ae766ff`](http://github.com/eggjs/egg-mock/commit/ae766ff582a3e14a28b97e15bad5a56efcb542bc)] - 👌 IMPROVE: Mock httpclient support delay ms and repeat times (#127) (fengmk2 <<fengmk2@gmail.com>>)

5.0.0 / 2022-09-29
==================

**features**
  * [[`60658ec`](http://github.com/eggjs/egg-mock/commit/60658ecae4a16ac1e52dc3238c279a61262f4620)] - 📦 NEW: [BREAKING] Support egg 3.0 (#126) (fengmk2 <<fengmk2@gmail.com>>)

4.2.1 / 2022-05-17
==================

**features**
  * [[`983e610`](http://github.com/eggjs/egg-mock/commit/983e6106b3047f3c0b8d1871fecf4b851cb3000a)] - feat: allow other envtype (#125) (吖猩 <<whx89768@alibaba-inc.com>>)

**others**
  * [[`bb9cb79`](http://github.com/eggjs/egg-mock/commit/bb9cb79dbd3d8999cc887d1f0ea952b5df449086)] - 📖 DOC: Change ci status badge (fengmk2 <<fengmk2@gmail.com>>)
  * [[`cd1f2db`](http://github.com/eggjs/egg-mock/commit/cd1f2dbd08683e60b31b83e3406c32a823124704)] - 📖 DOC: Update contributors (fengmk2 <<fengmk2@gmail.com>>)
  * [[`74c0d8f`](http://github.com/eggjs/egg-mock/commit/74c0d8f5a9532fa9e3b3f1c29ad27b59d46ea984)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)
  * [[`6bcc866`](http://github.com/eggjs/egg-mock/commit/6bcc8660a94c761dbdcee0a09bcd6d06e8441f49)] - 🤖 TEST: Fix assert cases (#124) (fengmk2 <<fengmk2@gmail.com>>)

4.2.0 / 2021-12-17
==================

**features**
  * [[`b45ad40`](http://github.com/eggjs/egg-mock/commit/b45ad40dd572977986cd86220f090d28c1268b70)] - feat: add mockLog, expectLog to type define (#121) (fengmk2 <<fengmk2@gmail.com>>)

4.1.0 / 2021-04-05
==================

**features**
  * [[`ce6ecde`](https://github.com/eggjs/egg-mock.git/commit/ce6ecde700a81ce986347834dbd2dc2d48217f88)] - feat: add consoleLogger error when mockApp init error (mansonchor.github.com <<mansonchor1987@gmail.com>>)

**others**
  * [[`e7c73e3`](https://github.com/eggjs/egg-mock.git/commit/e7c73e37814b6c9041f37bbcd92b3bb7c35758b3)] - build: remove node@6 (dead-horse <<dead_horse@qq.com>>)

4.0.1 / 2020-08-19
==================

**features**
  * [[`d5e584e`](http://github.com/eggjs/egg-mock/commit/d5e584e769dd348bc87a99a90f0a6003dfc7a4cf)] - feat: httpclient support mock async function (#117) (Yiyu He <<dead_horse@qq.com>>)

4.0.0 / 2020-03-01
==================

**features**
  * [[`c39109f`](http://github.com/eggjs/egg-mock/commit/c39109faa0eff01d8597c3988c04459c3520f309)] - feat: upgrade mm@3 (#116) (Yiyu He <<dead_horse@qq.com>>)

3.25.1 / 2020-01-17
==================

**fixes**
  * [[`51ef091`](http://github.com/eggjs/egg-mock/commit/51ef091cbb06ae74ff7f9591e3071db648ba5346)] - fix: backgroundTasksFinished ensure all tasks finished (#115) (Yiyu He <<dead_horse@qq.com>>)

3.25.0 / 2019-12-12
==================

**features**
  * [[`4c31c9e`](http://github.com/eggjs/egg-mock/commit/4c31c9e2917eea449e2afddf96fc8d2aabe6ad5e)] - feat: support init hook before mock app init (#109) (TZ | 天猪 <<atian25@qq.com>>)

**fixes**
  * [[`cbab52a`](http://github.com/eggjs/egg-mock/commit/cbab52a697e6e47abd48ce45320b7c40a0463c12)] - fix: enable sendRandom() method in unittest (#114) (GoodMeowing <<36814673+GoodMeowing@users.noreply.github.com>>)

3.24.2 / 2019-11-07
==================

**fixes**
  * [[`3bf5ded`](http://github.com/eggjs/egg-mock/commit/3bf5ded501608f2b5b3199d8b3d0ca0329dd9df7)] - fix: mockLog don't read file (#113) (Yiyu He <<dead_horse@qq.com>>)

3.24.1 / 2019-09-30
==================

**fixes**
  * [[`bd305d2`](http://github.com/eggjs/egg-mock/commit/bd305d21bd54395e597f3fce06758fcbb99ba43f)] - fix: single mode will call app.agent.close (#108) (TZ | 天猪 <<atian25@qq.com>>)

3.24.0 / 2019-09-26
==================

**features**
  * [[`315e685`](http://github.com/eggjs/egg-mock/commit/315e685d2059ec61e62e9109da8b58f9bf5552cd)] - feat: support app.notExpectLog() (#107) (fengmk2 <<fengmk2@gmail.com>>)

3.23.2 / 2019-09-10
==================

**fixes**
  * [[`e494325`](http://github.com/eggjs/egg-mock/commit/e494325562b84876a96062fd061ab4f8c7787a2e)] - fix: mockHttpclient with multi-request (#106) (吖猩 <<whx89768@alibaba-inc.com>>)
  * [[`d836536`](http://github.com/eggjs/egg-mock/commit/d8365368e2339f25874a7dfc1c573249ae841e8f)] - fix: fix httpRequest function signature (#105) (Colin Cheng <<zbinlin@gmail.com>>)

3.23.1 / 2019-05-20
==================

**fixes**
  * [[`6be0c43`](http://github.com/eggjs/egg-mock/commit/6be0c431ee1fd651c4f0bb6f433d7c4444b74708)] - fix: rimraf (#104) (TZ | 天猪 <<atian25@qq.com>>)

3.23.0 / 2019-05-20
==================

**features**
  * [[`9ada7f0`](http://github.com/eggjs/egg-mock/commit/9ada7f004def359a0b17f3824cea946abe4ed1f2)] - feat: mockHttpclient support fn (#103) (TZ | 天猪 <<atian25@qq.com>>)

3.22.4 / 2019-05-06
==================

**fixes**
  * [[`478581a`](http://github.com/eggjs/egg-mock/commit/478581a7851d19286c4e689af421a70cae27d26d)] - fix: remove egg-core deps (#101) (TZ | 天猪 <<atian25@qq.com>>)

3.22.3 / 2019-05-06
==================

**fixes**
  * [[`6174f9b`](http://github.com/eggjs/egg-mock/commit/6174f9b37698399785b99e86f2f45630f78a084f)] - fix: throw error when an egg plugin test is using bootstrap (#100) (TZ | 天猪 <<atian25@qq.com>>)

3.22.2 / 2019-04-10
==================

**fixes**
  * [[`a68ca65`](http://github.com/eggjs/egg-mock/commit/a68ca6549428e6c4dc886231d7c6b7fbefab46c6)] - fix: should emit server (#98) (TZ | 天猪 <<atian25@qq.com>>)

3.22.1 / 2019-03-12
==================

**fixes**
  * [[`3f73bad`](http://github.com/eggjs/egg-mock/commit/3f73bad59aa8acbb14399a914d31b8eb348ff493)] - fix: d.ts typo (#97) (TZ | 天猪 <<atian25@qq.com>>)

3.22.0 / 2019-03-11
==================

**features**
  * [[`81ed542`](http://github.com/eggjs/egg-mock/commit/81ed5427853067d84901c1848e630a8002ecfcf0)] - feat: add mock API for customLoader (#95) (Haoliang Gao <<sakura9515@gmail.com>>)

**fixes**
  * [[`58d0b32`](http://github.com/eggjs/egg-mock/commit/58d0b32a5851e4cd31492fe0e85c0e81336b6d04)] - fix:  remove nonexistent type and correct typing (#96) (Sinux <<askb@me.com>>)

3.21.0 / 2018-12-27
===================

  **features**
    * [[`93f8009`](https://github.com/eggjs/egg-mock/commit/93f8009c2f4c7d7f24b361f4713e035a2f993134)] - feat: cluster mock support result (#92) (TZ <<atian25@qq.com>>)
    * [[`be3d146`](https://github.com/eggjs/egg-mock/commit/be3d1466bf438a379b85429c40c510d6be7ecc26)] - feat: bootstrap support run on jest env (#93) (fengmk2 <<fengmk2@gmail.com>>)

3.20.1 / 2018-09-17
==================

**fixes**
  * [[`4b5dbb5`](http://github.com/eggjs/egg-mock/commit/4b5dbb512bf8f598d5ea5361c58ae9d40d528ff8)] - fix: add app.mockLog() to improve app.expectLog() more stable (#87) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`a64db33`](http://github.com/eggjs/egg-mock/commit/a64db33d2ee68a76f7c41303e79e37099f33b373)] - deps: add egg-logger dependency (#88) (fengmk2 <<fengmk2@gmail.com>>)

3.20.0 / 2018-08-30
==================

**features**
  * [[`283eef3`](http://github.com/eggjs/egg-mock/commit/283eef3a4f1b0bcd90cc0d6bcf6de9fe136d8503)] - feat: add `app.agent.mockHttpclient()` for agent (#82) (limerick <<guods2015@gmail.com>>)

3.19.7 / 2018-08-28
==================

**fixes**
  * [[`cc6b976`](http://github.com/eggjs/egg-mock/commit/cc6b976a66103dca44428e9ca4cf6e8d18b8323b)] - fix: app.messenger.broadcast send to self (君羽 <<ImHype@users.noreply.github.com>>)

3.19.6 / 2018-08-24
==================

**fixes**
  * [[`00fb82e`](http://github.com/eggjs/egg-mock/commit/00fb82eac8114f0be1a97421ea270947ea7b5efd)] - fix: fix declaration merging error (#86) (吖猩 <<whxaxes@qq.com>>)

3.19.5 / 2018-08-24
==================

**fixes**
  * [[`1635a90`](http://github.com/eggjs/egg-mock/commit/1635a9098d16df4ba4195d2e289476471bf96cb2)] - fix: show expectLog last 500 words on assert error (#85) (fengmk2 <<fengmk2@gmail.com>>)

3.19.4 / 2018-08-24
===================

  * feat: .d.ts 新增继承自 mm 的 api (#81)

3.19.3 / 2018-08-16
==================

**fixes**
  * [[`c91bf93`](http://github.com/eggjs/egg-mock/commit/c91bf93e792c788c4cdd7cf786a45fc2ecb4511d)] - fix: allow egg-core module missing (#83) (fengmk2 <<fengmk2@gmail.com>>)

3.19.2 / 2018-08-07
==================

**fixes**
  * [[`1710f7f`](http://github.com/eggjs/egg-mock/commit/1710f7fcfdbd8709d6b4c50817ab0c214c525378)] - fix: put mock restore at the end (#80) (fengmk2 <<fengmk2@gmail.com>>)

3.19.1 / 2018-08-07
==================

**fixes**
  * [[`db3cb11`](http://github.com/eggjs/egg-mock/commit/db3cb11a97ec6bdb3a70222a459241ffc3cc2c47)] - fix: make sure backgroundTasksFinished() return promise (#79) (fengmk2 <<fengmk2@gmail.com>>)

3.19.0 / 2018-08-06
==================

**features**
  * [[`ab5a47e`](https://github.com/eggjs/egg-mock.git/commit/ab5a47e12f1fea4300a44ef19aa4ba300574d18a)] - feat: should wait for background task finish on afterEach (#78) (fengmk2 <<fengmk2@gmail.com>>)

3.18.0 / 2018-08-03
==================

**features**
  * [[`f25c50a`](http://github.com/eggjs/egg-mock/commit/f25c50a24433e251e5c9f905170cea87e3ac93e6)] - feat: add `app.expectLog()` for app and cluster (#77) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`ffb1187`](http://github.com/eggjs/egg-mock/commit/ffb1187aab11bc544c4bc6c5921ca0fba28e621f)] - chore: improve tsd and add bootstrap.d.ts (#76) (SuperEVO <<zhang740@qq.com>>)

3.17.3 / 2018-07-14
===================

  * types: add bootstrap.d.ts (#75)

3.17.2 / 2018-05-21
==================

**others**
  * [[`62c3dfa`](http://github.com/eggjs/egg-mock/commit/62c3dfa517b94c56c35fed8af8d9aad29e7c38d4)] - refactor: middleware use promise-based style (#74) (Haoliang Gao <<sakura9515@gmail.com>>)

3.17.1 / 2018-04-21
===================

  * fix: remove options.typescript support (#73)

3.17.0 / 2018-03-30
===================

  * feat: support ts from env and pkg (#71)

3.16.0 / 2018-03-28
===================

  * feat: support ts (#70)
  * fix: mockSession save should not be enumerable (#69)

3.15.1 / 2018-03-20
==================

**fixes**
  * [[`3fbf862`](http://github.com/eggjs/egg-mock/commit/3fbf86232ee3c8e4944c8072e127c0f1ede1d26b)] - fix: mockSession save (#68) (TZ | 天猪 <<atian25@qq.com>>)

3.15.0 / 2018-03-08
==================

**features**
  * [[`9857065`](http://github.com/eggjs/egg-mock/commit/985706518e9ab8be155f285490484e5a304833fc)] - feat: add unexpectHeader() and expectHeader() (#67) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`f1820d7`](http://github.com/eggjs/egg-mock/commit/f1820d70f2e266d4b18fb7062976b4c14952a16f)] - feat: mm.app() support server event (#65) (fengmk2 <<fengmk2@gmail.com>>)

3.14.1 / 2018-02-28
==================

**fixes**
  * [[`d38d615`](http://github.com/eggjs/egg-mock/commit/d38d615c3f9bc79eb09c6864ab9d5833a50d029a)] - fix: mockUrl accepts RegExp (#64) (Brick <<brick.c.yang@gmail.com>>)

**others**
  * [[`23c1075`](http://github.com/eggjs/egg-mock/commit/23c1075f5aaaa866b0243061d0eadf21ce67d382)] - test: add post with multipart file test cases (#63) (fengmk2 <<fengmk2@gmail.com>>)

3.14.0 / 2017-12-12
==================

**others**
  * [[`be9bcd2`](http://github.com/eggjs/egg-mock/commit/be9bcd22c91044b0efdbc3db6b8109cf625002b1)] - refactor: modify d.ts and support bootstrap (Eward Song <<eward.song@gmail.com>>)

3.13.1 / 2017-10-17
==================

**fixes**
  * [[`9d071b2`](http://github.com/eggjs/egg-mock/commit/9d071b28c5ef341ee63ccb06f00f724922c698b2)] - fix: support mock the same property multiple times (#61) (Yiyu He <<dead_horse@qq.com>>)

3.13.0 / 2017-10-10
==================

**features**
  * [[`30ca0c9`](http://github.com/eggjs/egg-mock/commit/30ca0c980f3ee8b1f60f5213f0768fe5eeaaf49a)] - feat: port can be customized (#60) (Haoliang Gao <<sakura9515@gmail.com>>)

3.12.2 / 2017-09-22
==================

**fixes**
  * [[`5935564`](http://github.com/eggjs/egg-mock/commit/5935564d1e649f8702c0f3f79e67efde10717542)] - fix: missing methods package (dainli <<dainli@outlook.com>>)

**others**
  * [[`e7f518a`](http://github.com/eggjs/egg-mock/commit/e7f518a92e1686973bea557eb0a21f1d293ab0b4)] - fix(mockHttpclient): should use the copy of mockResult (#58) (Haoliang Gao <<sakura9515@gmail.com>>)
 * [new tag]         3.12.1     -> 3.12.1


3.12.1 / 2017-09-13
==================

**others**
  * [[`e7f518a`](http://github.com/eggjs/egg-mock/commit/e7f518a92e1686973bea557eb0a21f1d293ab0b4)] - fix(mockHttpclient): should use the copy of mockResult (#58) (Haoliang Gao <<sakura9515@gmail.com>>)

3.12.0 / 2017-09-12
==================

**others**
  * [[`25a0e28`](http://github.com/eggjs/egg-mock/commit/25a0e28e85209ec08a593b38cd434ed389ef8887)] - feat(mockHttpclient): use Regular Expression for matching url (#57) (Haoliang Gao <<sakura9515@gmail.com>>)

3.11.0 / 2017-09-11
==================

**features**
  * [[`f1a08a6`](http://github.com/eggjs/egg-mock/commit/f1a08a654a08313c0848828ee9051f8bf174fc6a)] - feat: support httpRequest().get(routerName) (#56) (fengmk2 <<fengmk2@gmail.com>>)

3.10.0 / 2017-08-30
==================

**features**
  * [[`f3654df`](http://github.com/eggjs/egg-mock/commit/f3654df99d4bee2ea0ee1ef580af7af66f21255d)] - feat: base promise to support async function (#55) (Yiyu He <<dead_horse@qq.com>>)

3.9.1 / 2017-08-14
==================

**fixes**
  * [[`d6cafaa`](http://github.com/eggjs/egg-mock/commit/d6cafaa531d9bbcc0fc987e7d6fdefd6a515e785)] - fix: fix agent type after ready (#54) (zōng yǔ <<gxcsoccer@users.noreply.github.com>>)

3.9.0 / 2017-08-02
==================

**features**
  * [[`9e1642c`](http://github.com/eggjs/egg-mock/commit/9e1642c7fc569d3cc4a73c9ede6511a18cca6fc5)] - feat: add bootstrap (#53) (Yiyu He <<dead-horse@users.noreply.github.com>>)

3.8.0 / 2017-06-21
==================

  * deps: upgrade dependencies (#51)
  * test: disable coverage when mm.cluster (#50)

3.7.2 / 2017-06-07
==================

  * fix(httpclient): miss headers on options when emit response (#49)

3.7.1 / 2017-06-01
==================

  * fix: detect prop object type can be non string (#48)

3.7.0 / 2017-05-18
===================

  * feat: support prerequire files (#46)

3.6.1 / 2017-05-11
==================

  * fix: ignore all error on cluster mock restore (#45)

3.6.0 / 2017-05-10
==================

  * chore: add tsd (#43)
  * feat: support mock function on cluster mode (#44)
  * deps: upgrade dependencies (#42)

3.5.0 / 2017-04-25
==================

  * feat: mockUrllib support async function (#41)

3.4.0 / 2017-04-17
==================

  * feat: should pass when emit egg-ready (#39)

3.3.0 / 2017-04-15
==================

  * feat: add app.httpRequest() test helper (#38)

3.2.0 / 2017-03-14
==================

  * feat: mockHttpClient support mock multi methods (#35)
  * test: remove userrole (#34)

3.1.2 / 2017-03-05
==================

  * fix: should pass all arguments when mockCookies (#33)

3.1.1 / 2017-03-04
==================

  * fix: egg-mock is not a framework (#32)

3.1.0 / 2017-03-02
==================

  * feat: use framework instead of customEgg (#31)

3.0.1 / 2017-02-22
==================

  * fix: app.close in right order (#30)

3.0.0 / 2017-02-13
==================

  * deps: upgrade egg (#29)
  * fix: bind messenger with app and agent (#28)
  * feat: [BREAKING_CHANGE] can get error from .ready() (#27)
  * test: remove unuse codes (#26)

2.4.0 / 2017-02-08
==================

  * feat: listen error that thrown when app init (#25)

2.3.1 / 2017-01-26
==================

  * fix: improve proxy handler and event listener (#24)

2.3.0 / 2017-01-25
==================

  * feat: cluster-client support for mm.app (#23)

2.2.0 / 2017-01-25
==================

  * feat: reimplement mm.app (#22)

2.1.0 / 2017-01-16
==================

  * feat: support read framework from package.json (#20)

2.0.0 / 2017-01-12
==================

  * refactor: use mockHttpclient instead of mockUrllib (#19)

1.3.0 (deprecated) / 2017-01-12
==================

  * refactor: use mockHttpclient instead of mockUrllib (#19)

1.2.1 / 2017-01-09
==================

  * fix: can't override data when mockContext(data) (#18)
  * fix: replace the internal link into an github link in the env comment. (#17)

1.2.0 / 2016-11-11
==================

  * feat: try to lookup egg that will be the default customEgg (#16)
  * fix: don't use cache when app from cache is closed (#15)

1.1.0 / 2016-11-02
==================

  * feat: add mm.home (#14)

1.0.0 / 2016-11-01
==================

  * test: add testcase (#10)

0.0.8 / 2016-10-25
==================

  * feat: wait 10ms to close app (#13)

0.0.7 / 2016-10-25
==================

  * feat: should close agent when app close (#12)

0.0.6 / 2016-10-24
==================

  * feat: cluster should wait process exit (#11)
  * docs:update readme (#9)
  * docs: update readme

0.0.5 / 2016-10-11
==================

  * feat: pass opt to coffee (#7)

0.0.4 / 2016-08-16
==================

  * fix: add eggPath for new egg (#5)
