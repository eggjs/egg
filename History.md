
1.0.0-rc.3 / 2017-03-10
=======================

  * docs: fix doc scroll bug (#532)
  * test: fix development test (#546)
  * doc: add Algolia docsearch (#542)
  * feat: [BREAKING_CHANGE] override array  when load config (#522)
  * docs: fix cookie example (#533)
  * feat: ignore types when dump (#518)
  * docs: rotate csrf token (#520)
  * refactor: [BREAKING CHANGE] remove userservice and userrole (#527)
  * refactor: [BREAKING_CHANGE] remove default validate plugin (#526)
  * docs: fix doc build (#524)
  * docs: fix middleware typo (#519)
  * docs(quickstart): fix keys again (#515)
  * docs(quickstart): fix keys (#511)
  * docs: add cookie and session (#510)
  * docs: fix html closing tag in quickstart (#512)
  * docs: quickstart tip (#502)
  * docs: add English version of `egg and koa` (#490)
  * feat: remove default customEgg (#487)
  * doc: add the view config for the egg-view-nunjucks (#496)
  * test: add qs security test cases (#491)
  * docs: remove meaningless word (#488)

1.0.0-rc.2 / 2017-03-01
=======================

  * deps: upgrade egg-session@2 to support external session store (#480)
  * docs: fix view plugin config at quickstart (#482)
  * docs: update document for view that using egg-view (#475)
  * docs: add config merge to faq (#478)
  * docs(doc): add english version of "what is egg" (#462)
  * docs: fix deployment link (#473)
  * docs: add document for deployment (#448)
  * test: travis test on node 8 using nightly building (#464)
  * docs: seperate cluster-and-ipc and cluster-client (#441)
  * docs: fixed typos 'BS' (#461)
  * docs: fixed spelling mistake (#460)
  * test: disable error log to stderr (#453)
  * docs: fix async-function demo link (#457)
  * feat: throw if config.keys not exists when access app.keys (#443)
  * docs: add year to licence && mysql docs (#447)
  * feat: extend runInBackground on application (#442)

1.0.0-rc.1 / 2017-02-23
=======================

  * feat: [BREAKING_CHANGE] reimplement view, use egg-view plugin  (#402)
  * fix: listen CookieLimitExceed in app (#429)
  * fix: close gracefully (#419)
  * docs: correct spelling mistake (#424)
  * feat: log error when cookie value's length exceed the limit (#418)
  * docs: Update mysql.md (#422)
  * docs: add more complete example code for quickstart (#412)
  * fix: deprecate warning when inspect & toJSON (#408)
  * docs: should listen egg-ready using messenger (#406)
  * docs: correct english description at README (#400)
  * docs: fix character type error and link reference error (#396)
  * docs: add csrf to faq (#393)
  * fix: keep unhandledRejectionError err object stack (#390)
  * docs: use compress replace bodyparser for example (#391)
  * docs: add directory structure (#383)
  * docs: add api-doc (#369)
  * docs: how to use koa's middleware (#386)
  * feat: dump config both after loaded and ready (#377)
  * docs: fix filename in config.md (#376)
  * docs: add plugin dep name description (#374)
  * docs: update version automatically (#367)
  * doc: add pm2 faq (#370)
  * docs: fix jsonp config in controller.md (#372)
  * feat: [BREAKING_CHANGE] remove notfound.enableRedirect (#368)
  * docs: add resource page (#364)
  * docs: add config result description (#365)
  * deps: upgrade egg-mock (#362)
  * docs: english wip description & remove unuse file (#361)
  * docs: add tutorials index & fix async (#359)

0.12.0 / 2017-02-12
===================

  * docs: fix async link (#357)
  * docs: add async await (#349)
  * docs: typo Github > GitHub (#356)
  * docs: update site style  (#340)
  * deps: upgrade egg-core (#350)
  * docs: add description to config/env file (#348)
  * docs: add APIClient concept to cluster doc (#344)
  * test: add async test case (#339)
  * feat: view base promise to support async function (#343)
  * feat: curl return promise (#342)
  * test: add class style controller tests (#336)
  * docs: add cnzz (#335)
  * test: improve coverage to 100% (#333)
  * docs: update egg-and-koa with async function (#334)
  * fix: remove tair and hsf (#332)
  * docs: quickstart - use controller class (#329)

0.11.0 / 2017-02-07
===================

  * feat: remove overrideMethod middleware (#324)
  * feat: remove worker client, use app.cluster (#282)
  * chore(scripts): Add PATH to find hexo (#327)
  * docs: fix quickstart example code (#326)
  * chore(scripts): deploy document by travis (#325)
  * docs: add httpclient tracer demo and docs (#313)
  * feat: close cluster clients before app close (#310)
  * test: mv benchmark to eggjs/benchmark (#320)
  * docs: document for plugin.{env}.js and the reason of plugin name (#321)
  * docs: add sigleton in plugin.md (#316)
  * docs: plugin and framework list use github tags (#318)
  * docs: remove outdated docs (#319)
  * docs: controller support class and refactor jsonp (#314)
  * docs: add more details about csrf (#315)

0.10.0 / 2017-02-03
===================

  * feat: remove tracer (#311)
  * refactor: use app.beforeClose (#306)
  * feat: move ctx.runtime to egg-instrument (#302)
  * feat: merge the api of application/agent from extend to instance (#294)
  * docs: add egg-security config to router docs (#303)
  * style: fix code style for app and config (#300)
  * refactor: remove ctx.jsonp and add egg-jsonp plugin (#299)
  * docs: fix typo $app to app (#297)
  * docs: remove inner links (#298)

0.9.0 / 2017-01-22
==================

  * feat: remove isAjax (#295)
  * test: fix cookie test cases (#296)
  * docs: adjust some words (#291)
  * feat: move clusterPort to egg-cluster (#281)
  * feat: move app.Service egg-core (#279)
  * docs: change egg-bin to egg-init (#284)
  * docs: improve framework doc based on eggjs/examples#9 (#267)
  * feat: remove instrument (#283)
  * docs: add progressive link && adjust en docs directory (#275)
  * docs: add progressive usage (#268)

0.8.0 / 2017-01-18
==================

  * test: dep -> dependencies (#270)
  * docs: translate zh-cn/basics/app-start.md into english (#222)
  * docs: fix quickstart typo (#266)
  * docs: add http client debug docs (#265)
  * docs: modify and fix 3 points (#264)
  * docs(intro): improve decription (#263)
  * docs: fix docs site version (#262)
  * docs: Fix typo.  (#261)
  * docs: review 1st version docs (#257)
  * fix: typo conext -> context (#259)
  * docs: contributing && readme && deps (#253)
  * docs: fix quickstart link in index.html (#256)
  * docs: set the default locale zh-cn (#255)
  * refactor: ctx.realStatus delegate ctx.response.realStatus (#252)
  * docs: Add intro/index.md (#246)
  * feat: adjust default plugins (#251)
  * docs: add RESTful documents (#247)
  * feat: delegate ctx.jsonp to ctx.response.jsonp (#248)
  * chore: remove examples (#245)
  * docs: improve mysql doc
  * docs: add mysql doc
  * docs: view (#228)
  * docs: improve doc theme (#230)
  * docs: add core/unittest.md (#199)
  * docs: add advanced/framework.md (#225)

0.7.0 / 2017-01-12
==================

  * docs: add service doc (#221)
  * docs: serverEnv => env (#239)
  * feat: delegate configurations in app (#233)
  * refactor: remove ctx.getCookie, ctx.setCookie and ctx.deleteCookie (#240)
  * docs: remove mon-printable character (#242)
  * feat: support app.config.proxy to identify app is behind a proxy (#231)
  * doc: add plugin doc (#224)
  * docs: add Quick Start in English (#223)
  * docs: add basics/controller.md (#209)
  * docs: add core/development.md (#214)
  * docs: remove init.js from document, use app.beforeStart (#229)
  * docs: quickstart (#217)
  * docs: add security plugin doc (#196)
  * docs: mv cluster.md to zh-cn (#216)
  * feat: add cluster-client (#191)
  * docs: add basics/router.md (#203)
  * docs: add advanced/loader.md (#198)
  * docs: fix i18n doc (#210)
  * docs: add core/i18n.md (#208)
  * docs: add core/httpclient document (#197)
  * docs: typo (#207)
  * docs: add core/logger.md (#204)
  * docs: add one more reason why not use koa 2 (#206)
  * docs: add error handling (#205)
  * docs: add schedule (#202)
  * docs: add english translation of basics/env.md
  * docs: basics/middleware (#194)
  * docs: add basics/config.md (#188)
  * doc: app start (#193)
  * docs: rename koa.md to egg-and-koa.md (#190)
  * docs: egg and koa (#179)
  * doc: add basics/env.md (#178)
  * doc: rename guide/basics/extend.md to basics/extend.md (#189)
  * doc: guide/basics/extend doc (#187)

0.6.3 / 2016-12-30
==================

  * refactor: use logger.close, .end is deprecated (#171)

0.6.2 / 2016-12-22
==================

  * refactor(config): set keepAliveTimeout 4000ms by default (#165)

0.6.1 / 2016-12-21
==================

  * refactor: use sendToApp/sendToAgent in worker client
  * fix: protocolHeaders can split with whitespace (#164)
  * deps: update version (#157)

0.6.0 / 2016-12-03
==================

  * deps: egg-cookies@2 (#155)
  * fix: already supported in egg-core (#154)
  * feat: body parser support disable, ignore and match (#150)
  * feat: use appInfo.root in config (#147)
  * test: refactor workclient test cases (#145)
  * feat: add a dns cache httpclient (#146)

0.5.0 / 2016-11-04
==================

  * deps: upgrade dependencies (#144)
  * feat: warn when agent send message before started (#143)
  * feat: [BREAKING_CHANGE] refactor Messenger (#141)
  * feat: print error to console on unittest env (#139)
  * feat: add ip setter on request (#138)
  * feat: add getLogger to app and ctx (#136)
  * test: remove co-sleep deps
  * test: add local server for curl test cases
  * test: use fs read instead of curl test on runInBackground

0.4.0 / 2016-10-29
==================

  * deps: update version (#135)
  * feat: support background task on ctx (#119)
  * chore: add middleware example (#121)

0.3.0 / 2016-10-28
==================

  * test: fix unstable test (#133)
  * feat: close return promise (#128)
  * deps: update deps version (#113)
  * fix: AppWorkerClient subscribe same data failed issue (#110)

0.2.1 / 2016-09-16
==================

  * feat(application): emit startTimeout event (#107)
  * perf: get header using lower case (#106)
  * chore: remove --fix for error check but not fix (#101)
  * doc: Add Installation (#95)
  * doc: add title (#94)

0.2.0 / 2016-09-03
==================

  * docs: improve documents
  * test: update benchmark scripts (#79)
  * test: add router for bench cases (#78)
  * fix: set header use lowercase (#76)
  * test: add toa benchmark (#75)
  * test: add benchmark results (#74)
  * test: fix security tests (#73)
  * test: egg-view-nunjucks change views -> view (#72)

0.1.3 / 2016-08-31
==================

  * fix: utils.assign support undefined (#71)
  * refactor: change accept to getter (#68)

0.1.2 / 2016-08-31
==================

  * deps: egg-security@1 (#67)
  * Revert raw header (#65)
  * feat: [BREAKING_CHANGE] remove poweredBy && config.core (#63)

0.1.1 / 2016-08-29
==================

  * refactor: use ctx.setRawHeader (#61)
  * chore: add benchmarks (#62)
  * fix(meta): remove server-id (#56)
  * feat(response): add res.setRawHeader (#60)
  * refator: use utils.assign instead of Object.assign (#59)
  * feat: docs structure (#55)
  * docs: web.md and web.zh_CN.md (#54)

0.1.0 / 2016-08-18
==================

  * feat: [BREAKING_CHANGE] use egg-core (#44)
  * doc: translate to EN (#25)
  * fix: Error of no such file or directory, scandir '/restful_api/app/api' (#42)
  * test: fix default plugins test (#37)
  * feat: add inner plugins (#24)
  * docs: add schedule example (#30)

0.0.5 / 2016-07-20
==================

  * refactor(core): let ctx.cookies become a getter (#22)
  * fix(messenger): init when create app and agent (#21)
  * test: add test codes (#20)

0.0.1 / 2016-07-13
==================

 * init version
