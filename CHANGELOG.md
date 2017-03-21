<a name="1.0.0"></a>
# [1.0.0](https://github.com/eggjs/egg/compare/1.0.0-rc.3...1.0.0) (2017-03-21)


### Features

* show warning message with call stack ([#549](https://github.com/eggjs/egg/issues/549)) ([d088283](https://github.com/eggjs/egg/commit/d088283))



<a name="1.0.0-rc.3"></a>
# [1.0.0-rc.3](https://github.com/eggjs/egg/compare/1.0.0-rc.2...1.0.0-rc.3) (2017-03-10)


### Features

* [BREAKING_CHANGE] override array  when load config ([#522](https://github.com/eggjs/egg/issues/522)) ([4766e35](https://github.com/eggjs/egg/commit/4766e35))
* ignore types when dump ([#518](https://github.com/eggjs/egg/issues/518)) ([59a3669](https://github.com/eggjs/egg/commit/59a3669))
* remove default customEgg ([#487](https://github.com/eggjs/egg/issues/487)) ([2fb89df](https://github.com/eggjs/egg/commit/2fb89df))



<a name="1.0.0-rc.2"></a>
# [1.0.0-rc.2](https://github.com/eggjs/egg/compare/1.0.0-rc.1...1.0.0-rc.2) (2017-03-01)


### Features

* extend runInBackground on application ([#442](https://github.com/eggjs/egg/issues/442)) ([80a06fc](https://github.com/eggjs/egg/commit/80a06fc))
* throw if config.keys not exists when access app.keys ([#443](https://github.com/eggjs/egg/issues/443)) ([4eaf3fb](https://github.com/eggjs/egg/commit/4eaf3fb))



<a name="1.0.0-rc.1"></a>
# [1.0.0-rc.1](https://github.com/eggjs/egg/compare/0.12.0...1.0.0-rc.1) (2017-02-23)


### Bug Fixes

* close gracefully ([#419](https://github.com/eggjs/egg/issues/419)) ([ed97533](https://github.com/eggjs/egg/commit/ed97533))
* deprecate warning when inspect & toJSON ([#408](https://github.com/eggjs/egg/issues/408)) ([bf518db](https://github.com/eggjs/egg/commit/bf518db))
* keep unhandledRejectionError err object stack ([#390](https://github.com/eggjs/egg/issues/390)) ([0de9f35](https://github.com/eggjs/egg/commit/0de9f35))
* listen CookieLimitExceed in app ([#429](https://github.com/eggjs/egg/issues/429)) ([b781db1](https://github.com/eggjs/egg/commit/b781db1))


### Features

* [BREAKING_CHANGE] reimplement view, use egg-view plugin  ([#402](https://github.com/eggjs/egg/issues/402)) ([3ba38b1](https://github.com/eggjs/egg/commit/3ba38b1))
* [BREAKING_CHANGE] remove notfound.enableRedirect ([#368](https://github.com/eggjs/egg/issues/368)) ([1d93002](https://github.com/eggjs/egg/commit/1d93002))
* dump config both after loaded and ready ([#377](https://github.com/eggjs/egg/issues/377)) ([06b4028](https://github.com/eggjs/egg/commit/06b4028))
* log error when cookie value's length exceed the limit ([#418](https://github.com/eggjs/egg/issues/418)) ([54a3e3c](https://github.com/eggjs/egg/commit/54a3e3c))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/eggjs/egg/compare/0.11.0...0.12.0) (2017-02-12)


### Bug Fixes

* remove tair and hsf ([#332](https://github.com/eggjs/egg/issues/332)) ([0d2358d](https://github.com/eggjs/egg/commit/0d2358d))


### Features

* curl return promise ([#342](https://github.com/eggjs/egg/issues/342)) ([6dd9feb](https://github.com/eggjs/egg/commit/6dd9feb))
* view base promise to support async function ([#343](https://github.com/eggjs/egg/issues/343)) ([c6914e0](https://github.com/eggjs/egg/commit/c6914e0))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/eggjs/egg/compare/0.10.0...0.11.0) (2017-02-07)


### Features

* close cluster clients before app close ([#310](https://github.com/eggjs/egg/issues/310)) ([1642f5e](https://github.com/eggjs/egg/commit/1642f5e))
* remove overrideMethod middleware ([#324](https://github.com/eggjs/egg/issues/324)) ([08bc84e](https://github.com/eggjs/egg/commit/08bc84e))
* remove worker client, use app.cluster ([#282](https://github.com/eggjs/egg/issues/282)) ([0ee4451](https://github.com/eggjs/egg/commit/0ee4451))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/eggjs/egg/compare/0.9.0...0.10.0) (2017-02-03)


### Features

* merge the api of application/agent from extend to instance ([#294](https://github.com/eggjs/egg/issues/294)) ([0e0bef5](https://github.com/eggjs/egg/commit/0e0bef5))
* move ctx.runtime to egg-instrument ([#302](https://github.com/eggjs/egg/issues/302)) ([41cc411](https://github.com/eggjs/egg/commit/41cc411))
* remove tracer ([#311](https://github.com/eggjs/egg/issues/311)) ([0c38b9b](https://github.com/eggjs/egg/commit/0c38b9b))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/eggjs/egg/compare/0.8.0...0.9.0) (2017-01-22)


### Features

* move app.Service egg-core ([#279](https://github.com/eggjs/egg/issues/279)) ([99338c7](https://github.com/eggjs/egg/commit/99338c7))
* move clusterPort to egg-cluster ([#281](https://github.com/eggjs/egg/issues/281)) ([737e82a](https://github.com/eggjs/egg/commit/737e82a))
* remove instrument ([#283](https://github.com/eggjs/egg/issues/283)) ([d0d0a75](https://github.com/eggjs/egg/commit/d0d0a75))
* remove isAjax ([#295](https://github.com/eggjs/egg/issues/295)) ([d4be778](https://github.com/eggjs/egg/commit/d4be778)), closes [#186](https://github.com/eggjs/egg/issues/186)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/eggjs/egg/compare/0.7.0...0.8.0) (2017-01-18)


### Bug Fixes

* typo conext -> context ([#259](https://github.com/eggjs/egg/issues/259)) ([23e9122](https://github.com/eggjs/egg/commit/23e9122))


### Features

* adjust default plugins ([#251](https://github.com/eggjs/egg/issues/251)) ([20571f6](https://github.com/eggjs/egg/commit/20571f6))
* delegate ctx.jsonp to ctx.response.jsonp ([#248](https://github.com/eggjs/egg/issues/248)) ([d0aa3b8](https://github.com/eggjs/egg/commit/d0aa3b8))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/eggjs/egg/compare/0.6.3...0.7.0) (2017-01-11)


### Features

* add cluster-client ([#191](https://github.com/eggjs/egg/issues/191)) ([00b7eb3](https://github.com/eggjs/egg/commit/00b7eb3))
* delegate configurations in app ([#233](https://github.com/eggjs/egg/issues/233)) ([e4843f1](https://github.com/eggjs/egg/commit/e4843f1))
* support app.config.proxy to identify app is behind a proxy ([#231](https://github.com/eggjs/egg/issues/231)) ([96d5360](https://github.com/eggjs/egg/commit/96d5360))



<a name="0.6.3"></a>
## [0.6.3](https://github.com/eggjs/egg/compare/0.6.2...0.6.3) (2016-12-29)



<a name="0.6.2"></a>
## [0.6.2](https://github.com/eggjs/egg/compare/0.6.1...0.6.2) (2016-12-21)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/eggjs/egg/compare/0.6.0...0.6.1) (2016-12-21)


### Bug Fixes

* protocolHeaders can split with whitespace ([#164](https://github.com/eggjs/egg/issues/164)) ([db614d4](https://github.com/eggjs/egg/commit/db614d4))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/eggjs/egg/compare/0.5.0...0.6.0) (2016-12-03)


### Bug Fixes

* already supported in egg-core ([#154](https://github.com/eggjs/egg/issues/154)) ([4062648](https://github.com/eggjs/egg/commit/4062648))


### Features

* add a dns cache httpclient ([#146](https://github.com/eggjs/egg/issues/146)) ([5045131](https://github.com/eggjs/egg/commit/5045131))
* body parser support disable, ignore and match ([#150](https://github.com/eggjs/egg/issues/150)) ([1082d6d](https://github.com/eggjs/egg/commit/1082d6d))
* use appInfo.root in config ([#147](https://github.com/eggjs/egg/issues/147)) ([c736ac9](https://github.com/eggjs/egg/commit/c736ac9))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/eggjs/egg/compare/0.4.0...0.5.0) (2016-11-04)


### Features

* [BREAKING_CHANGE] refactor Messenger ([#141](https://github.com/eggjs/egg/issues/141)) ([a65f472](https://github.com/eggjs/egg/commit/a65f472)), closes [eggjs/egg#28](https://github.com/eggjs/egg/issues/28)
* add getLogger to app and ctx ([#136](https://github.com/eggjs/egg/issues/136)) ([cd99a1f](https://github.com/eggjs/egg/commit/cd99a1f)), closes [eggjs/egg#36](https://github.com/eggjs/egg/issues/36)
* add ip setter on request ([#138](https://github.com/eggjs/egg/issues/138)) ([e646fed](https://github.com/eggjs/egg/commit/e646fed))
* print error to console on unittest env ([#139](https://github.com/eggjs/egg/issues/139)) ([5900c1b](https://github.com/eggjs/egg/commit/5900c1b)), closes [eggjs/egg#127](https://github.com/eggjs/egg/issues/127)
* warn when agent send message before started ([#143](https://github.com/eggjs/egg/issues/143)) ([5178b27](https://github.com/eggjs/egg/commit/5178b27)), closes [eggjs/egg#118](https://github.com/eggjs/egg/issues/118)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/eggjs/egg/compare/0.3.0...0.4.0) (2016-10-29)


### Features

* support background task on ctx ([#119](https://github.com/eggjs/egg/issues/119)) ([56d1deb](https://github.com/eggjs/egg/commit/56d1deb))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/eggjs/egg/compare/0.2.1...0.3.0) (2016-10-28)


### Bug Fixes

* AppWorkerClient subscribe same data failed issue ([#110](https://github.com/eggjs/egg/issues/110)) ([163aa7e](https://github.com/eggjs/egg/commit/163aa7e))


### Features

* close return promise ([#128](https://github.com/eggjs/egg/issues/128)) ([5dafb58](https://github.com/eggjs/egg/commit/5dafb58))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/eggjs/egg/compare/0.2.0...0.2.1) (2016-09-16)


### Features

* **application:** emit startTimeout event ([#107](https://github.com/eggjs/egg/issues/107)) ([448ba52](https://github.com/eggjs/egg/commit/448ba52))


### Performance Improvements

* get header using lower case ([#106](https://github.com/eggjs/egg/issues/106)) ([d246b76](https://github.com/eggjs/egg/commit/d246b76))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/eggjs/egg/compare/0.1.3...0.2.0) (2016-09-02)


### Bug Fixes

* set header use lowercase ([#76](https://github.com/eggjs/egg/issues/76)) ([711f9c0](https://github.com/eggjs/egg/commit/711f9c0))



<a name="0.1.3"></a>
## [0.1.3](https://github.com/eggjs/egg/compare/0.1.2...0.1.3) (2016-08-31)


### Bug Fixes

* utils.assign support undefined ([#71](https://github.com/eggjs/egg/issues/71)) ([f6e4ee7](https://github.com/eggjs/egg/commit/f6e4ee7))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/eggjs/egg/compare/0.1.1...0.1.2) (2016-08-30)


### Features

* [BREAKING_CHANGE] remove poweredBy && config.core ([#63](https://github.com/eggjs/egg/issues/63)) ([7a17c0f](https://github.com/eggjs/egg/commit/7a17c0f))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/eggjs/egg/compare/0.1.0...0.1.1) (2016-08-29)


### Bug Fixes

* **meta:** remove server-id ([#56](https://github.com/eggjs/egg/issues/56)) ([36aaa4e](https://github.com/eggjs/egg/commit/36aaa4e))


### Features

* docs structure ([#55](https://github.com/eggjs/egg/issues/55)) ([0e14814](https://github.com/eggjs/egg/commit/0e14814))
* **response:** add res.setRawHeader ([#60](https://github.com/eggjs/egg/issues/60)) ([e345598](https://github.com/eggjs/egg/commit/e345598))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/eggjs/egg/compare/0.0.5...0.1.0) (2016-08-18)


### Bug Fixes

* Error of no such file or directory, scandir '/restful_api/app/api' ([#42](https://github.com/eggjs/egg/issues/42)) ([6a56494](https://github.com/eggjs/egg/commit/6a56494))


### Features

* [BREAKING_CHANGE] use egg-core ([#44](https://github.com/eggjs/egg/issues/44)) ([350d0f5](https://github.com/eggjs/egg/commit/350d0f5))
* add inner plugins ([#24](https://github.com/eggjs/egg/issues/24)) ([fcf907b](https://github.com/eggjs/egg/commit/fcf907b))



<a name="0.0.5"></a>
## [0.0.5](https://github.com/eggjs/egg/compare/0.0.4...0.0.5) (2016-07-20)


### Bug Fixes

* **messenger:** init when create app and agent ([#21](https://github.com/eggjs/egg/issues/21)) ([1b6173e](https://github.com/eggjs/egg/commit/1b6173e))



<a name="0.0.4"></a>
## [0.0.4](https://github.com/eggjs/egg/compare/dadd208...0.0.4) (2016-07-17)


### Features

* init version sources ([#15](https://github.com/eggjs/egg/issues/15)) ([dadd208](https://github.com/eggjs/egg/commit/dadd208))



