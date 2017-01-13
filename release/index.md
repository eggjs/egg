layout: release
---


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
