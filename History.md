# History

## 2020-10-19, Version 2.29.1 @atian25

### Notable Changes

* **fixes**
  * revert clear timing after ready, only disable
  * won't set keep-alive header at Node.js ^12.19.0 || >=14.8.0

### Commits

  * [[`9f653afe7`](http://github.com/eggjs/egg/commit/9f653afe790e0ead44109c68dfffb8353fdca56c)] - fix: remove clear timing && skip keep-alive after 12.19.0 (#4497) (TZ | 天猪 <<atian25@qq.com>>)


## 2020-09-23, Version 2.29.0 @atian25

### Notable Changes

* **features**
  * dumpconfig also dump disabled plugin

* **docs**
  * csrf double cookie defense should enabled on all method
  * test case for env.EGG_APP_CONFIG
  * optimize multiple env configuration description

### Commits

  * [[`cc80c6ab8`](http://github.com/eggjs/egg/commit/cc80c6ab86c71b1c9ea244065d4766297bfb6c17)] - feat: dumpconfig also dump disabled plugin (#4480) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`1d32771e5`](http://github.com/eggjs/egg/commit/1d32771e5aeb8fa8546ad8bfacf2f438973afae0)] - doc: csrf double cookie defense should enabled on all method (#3881) (Hongcai Deng <<admin@dhchouse.com>>)
  * [[`504e4bebc`](http://github.com/eggjs/egg/commit/504e4bebcef03830be7c7432210b5b6b1de9d06b)] - test: for env.EGG_APP_CONFIG (#4468) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`ff4dfaa09`](http://github.com/eggjs/egg/commit/ff4dfaa098ad40ab7a0773c44d409829fcbb0e41)] - docs(config): optimize multiple env configuration description (#4406) (Andy <<xiaoxiaocoder@126.com>>)
  * [[`b283791da`](http://github.com/eggjs/egg/commit/b283791dab3c86beb14506668e2aa3ef21cb78e6)] - docs: update badge to github action (#4463) (TZ | 天猪 <<atian25@qq.com>>)


## 2020-09-08, Version 2.28.0 @atian25

### Notable Changes

* **features**
  * clear & disable timing after ready

* **fixes**
  * only set keep-alive header before Node.js 14.8.0

* **typings**
  * Added missing types in HttpClientConfig
  * export EggLogger/EggHttpClient/EggContextHttpClient

* **docs**
  * fixed grammatical and spelling errors
  * update compress url

### Commits

  * [[`b31b47df1`](http://github.com/eggjs/egg/commit/b31b47df10722bfac7ac13771db534f0200fc6ce)] - feat: clear & disable timing after ready (#4421) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`d25d32e58`](http://github.com/eggjs/egg/commit/d25d32e584b0bfd80f21cc522b91ac465f2852ac)] - fix: only set keep-alive header before Node.js 14.8.0 (#4457) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`a7ae46c84`](http://github.com/eggjs/egg/commit/a7ae46c847db07c0c4af1a85173bc4009d1219d9)] - type: Added missing types in HttpClientConfig (#4388) (Gcaufy <<gcaufy@gmail.com>>)
  * [[`064cc7a91`](http://github.com/eggjs/egg/commit/064cc7a91a2be89e39d72a833a1cb35cdcd8f201)] - docs: fixed grammatical and spelling errors (#4424) (Hridayesh Sharma <<dev.hridayesh@gmail.com>>)
  * [[`95776d646`](http://github.com/eggjs/egg/commit/95776d6462080448e946c049f9ad4da4e9fc065e)] - docs: fix spelling mistakes and grammatical errors (#4423) (Hridayesh Sharma <<vyasriday7@gmail.com>>)
  * [[`50976280f`](http://github.com/eggjs/egg/commit/50976280fcb19ce556ddc46f76da1f5fab46fa4a)] - docs: update compress url  (#4415) (忽如寄 <<594613537@qq.com>>)

## 2020-06-29, Version 2.27.0 @killa

### Notable Changes

* **typings**
  * fix curl type
  * export EggLogger/EggHttpClient/EggContextHttpClient

* **docs**
  * update docs about how to extends ctx.helper

### Commits

  * [[`b5cc8b6e3`](http://github.com/eggjs/egg/commit/b5cc8b6e361b1ac2e7b4eb509f1e6486fe1dab13)] - fix(dts): fix curl type (#4312) (胡宇航 <<591765099@qq.com>>)
  * [[`432128a80`](http://github.com/eggjs/egg/commit/432128a80aefdc8d11a6571da1ff35550e85fd66)] - type: export EggLogger/EggHttpClient/EggContextHttpClient (#4280) (killa <<killa123@126.com>>)
  * [[`eca6b04c1`](http://github.com/eggjs/egg/commit/eca6b04c1c50bc69c53f9910cc35bb7441c7cb02)] - docs:update docs about how to extends ctx.helper (#4362) (EasonQwQ <<750225883@qq.com>>)


## 2020-05-13, Version 2.26.1 @dead-horse

### Notable Changes

* **fixes**
  * runInBackground always run after setImmediate

* **docs**
  * imporve docs
  * imporve typings

### Commits

  * [[`9c67298d6`](http://github.com/eggjs/egg/commit/9c67298d69946d4ba0887c3648d3404e835c6902)] - test: run test on node 14 (#4272) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`427a30a07`](http://github.com/eggjs/egg/commit/427a30a071d248cc2e5e15bb4bad35f3058e867f)] - test: make dnscache test case more stable (#4297) (Yiyu He <<dead_horse@qq.com>>)
  * [[`64efd076b`](http://github.com/eggjs/egg/commit/64efd076bf9d937e36748f89bada6fce186913cd)] - fix: runInBackground always run after setImmediate (#4296) (Yiyu He <<dead_horse@qq.com>>)
  * [[`69923977a`](http://github.com/eggjs/egg/commit/69923977a7e5c0825f2fc5c616852b0721411a0c)] - docs: Update doc for config of logger.consoleLevel (#4276) (xuxu <<must414@163.com>>)
  * [[`7b6e4371c`](http://github.com/eggjs/egg/commit/7b6e4371c7367583627977a0ca4aa2ff66e28429)] - docs(typescript): Add --noEmit to unittest example code (#4250) (Ink <<chceyes@gmail.com>>)
  * [[`3413e35fd`](http://github.com/eggjs/egg/commit/3413e35fd86408896e5c0b7e77ec2528ac08c9f9)] - chore: fix typo (#4234) (zoomdong <<1344492820@qq.com>>)
  * [[`b4b9b50af`](http://github.com/eggjs/egg/commit/b4b9b50af1bb842e0138fc236d45882188698123)] - doc (socketio): fix packet middleware bug (#4204) (zfx <<502545703@qq.com>>)
  * [[`2fcd605c6`](http://github.com/eggjs/egg/commit/2fcd605c6397480b0a5add9c11f7c7d071393de5)] - docs: update bodyParser types and doc (#4192) (sexy pig <<353071655@qq.com>>)
  * [[`5e2bad0c4`](http://github.com/eggjs/egg/commit/5e2bad0c421952b7c84471df06d2ca80c20fa14c)] - docs: fix typo in router (#4203) (Xuemuyang <<myoungxue@gmail.com>>)
  * [[`1181a675c`](http://github.com/eggjs/egg/commit/1181a675cae08c2d6952b8c15a3a9375947e220b)] - docs(plugin): format en/basics/plugin.md (#4168) (chs97 <<623528324@qq.com>>)
  * [[`e9011e8f3`](http://github.com/eggjs/egg/commit/e9011e8f332a97da7e6e112d0f1ded42f0b5db42)] - feat: add http method patch to typings (#4125) (xiaoxu <<xiao.xu515@gmail.com>>)
  * [[`2109505b4`](http://github.com/eggjs/egg/commit/2109505b40a159cd047075e566e9465b1ad5a365)] - test: fix doctools path on windows (#4090) (fengmk2 <<fengmk2@gmail.com>>)


## 2019-12-07, Version 2.26.0 @fengmk2

### Notable changes

* **features**
  * add application level Cookie options, can fix [Cookie SameSite warning on Chrome](https://support.google.com/chrome/thread/16654793?hl=en) now.
  * use new URL instead of url.parse, avoiding potential security issues.

### Commits

  * [[`b28134e77`](http://github.com/eggjs/egg/commit/b28134e7709c803eb7a7ed071a25bac8a28e3d1f)] - feat: add application level Cookie options (#4086) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`b7718c1cc`](http://github.com/eggjs/egg/commit/b7718c1cc2b94b02ee728088060fdbc85e462b6d)] - fix: use new URL instead of url.parse (#4048) (Yiyu He <<dead_horse@qq.com>>)
  * [[`afed9105d`](http://github.com/eggjs/egg/commit/afed9105df34aad60c40ecba0e44ddaad1a605dc)] - fix: index.d.ts (#4012) (dxd <<dxd_sjtu@outlook.com>>)
  * [[`690711bab`](http://github.com/eggjs/egg/commit/690711bab8bd8c838b4dd651baea3bc49a5fa1f1)] - test: fix the testcase error of load_boot.test.js (#4041) (Xin Wang <<wangxinalex@gmail.com>>)
  * [[`6c55a436b`](http://github.com/eggjs/egg/commit/6c55a436bf2afb7bb99810401a6f92b3a58471ff)] - docs: fix typo (#4028) (Xuehua Cai <<pixcai@163.com>>)

## 2019-10-28, Version 2.25.0 @dead-horse

### Notable changes

* **features**
  * support config.maxIpsCount, deprecate config.maxProxyCount
  * singleton returns client name when create client

### Commits

  * [[`b3479e8e2`](http://github.com/eggjs/egg/commit/b3479e8e2b6cc74c95eef4334bd6b054fddb6158)] - feat: support config.maxIpsCount (#4014) (Yiyu He <<dead_horse@qq.com>>)
  * [[`380e7d634`](http://github.com/eggjs/egg/commit/380e7d6344b4f608397fed5dea4f19918ca347f5)] - docs(env): cleanup the document (#3988) (Alpha <<AlphaWong@users.noreply.github.com>>)
  * [[`2c5e64a50`](http://github.com/eggjs/egg/commit/2c5e64a50edd78522aa5bf83e4ea8ef4d72f5b40)] - docs: add promo link (#3995) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`adca16637`](http://github.com/eggjs/egg/commit/adca1663712acd361dddd1b390ca48dda5a3608e)] - docs(deployment): update the description for hostname (#3994) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`27dacb7c9`](http://github.com/eggjs/egg/commit/27dacb7c9dae4b65c1b973d39aae1f8c9a4cd7b1)] - feat:Singleton returns client name when create client (#3905) (暗色调 <<41288382+dark-tone@users.noreply.github.com>>)
  * [[`d3f68c371`](http://github.com/eggjs/egg/commit/d3f68c3710946a63f640b1885e9c7120db935d8e)] - docs(deployment): modify hostname (#3987) (zfx <<502545703@qq.com>>)
  * [[`73ad6c086`](http://github.com/eggjs/egg/commit/73ad6c0861d5d6f8235fde2a5ba985ad9f53fcfe)] - chore: use github actions to run CI (#3974) (Suyi <<thonatos@users.noreply.github.com>>)


## 2019-10-11, Version 2.24.0 @thonatos

### Notable changes

* **features**
  * feat: set default body-parser limitation to 1mb

* **fixes**
  * app.keys getter must have a setter either
  * more log for bodyParser

* **docs**
  * add opencollective to sponsors list
  * update lf url
  * fix hsts docs error
  * fix typo of socket.io
  * modify invalid links

### Commits

  * [[`bddf1e183`](http://github.com/eggjs/egg/commit/bddf1e183b5b6fc0f1414f81948ffdedd71e16a9)] - feat: set default body-parser limitation to 1mb (#3903) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`5ddf07c43`](http://github.com/eggjs/egg/commit/5ddf07c435ad81142a6e995583849e20c7348dda)] - docs: update readme (#3968) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`be1b72606`](http://github.com/eggjs/egg/commit/be1b72606a62a8efe88849976126cc8ca61b8d7e)] - docs(security): hsts is disabled by default (#3972) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`e5e948783`](http://github.com/eggjs/egg/commit/e5e948783a45ea138592a33e9ae7faa20a85af26)] - docs: add opencollective to sponsors list (#3971) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`cde921456`](http://github.com/eggjs/egg/commit/cde921456657c16dba81c6fb9c991b62a826d120)] - docs: update lf url (#3922) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`17b22c86b`](http://github.com/eggjs/egg/commit/17b22c86b7f83bc168d9c7176191618e19add1dd)] - docs: fix typo of socket.io (#3895) (lqzhgood <<9134671+lqzhgood@users.noreply.github.com>>)
  * [[`a9d0cf5c0`](http://github.com/eggjs/egg/commit/a9d0cf5c0d5aadc957e12854f7a3ab6469f83f75)] - fix: app.keys getter must have a setter either (#3891) (Yiyu He <<dead_horse@qq.com>>)
  * [[`f1707410b`](http://github.com/eggjs/egg/commit/f1707410bc3f703d69aae27965cc622b9a768107)] - docs(deployment): add logs that the egg app has been successfully connected to alinode (#3868) (hyj1991 <<yeekwanvong@gmail.com>>)
  * [[`24c388b4a`](http://github.com/eggjs/egg/commit/24c388b4a5ec4c717875a1510accbd5882800ad0)] - docs(egg-and-koa): modify invalid links (#3851) (sdjdd <<352207572@qq.com>>)
  * [[`84894e871`](http://github.com/eggjs/egg/commit/84894e8714747876821447faeaada0dabc2a7147)] - chore: add sponsor config (#3751) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`064616934`](http://github.com/eggjs/egg/commit/064616934b4ff2c044395baae60bd33d3d7dc5ff)] - chore: add node12 for ci (#3196) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`45a966621`](http://github.com/eggjs/egg/commit/45a966621746f9d2c9e8a91fc1b17f75d97033de)] - docs(quickstart): npm version for npm init command (#3836) (QingDeng <<zrl412@163.com>>)
  * [[`341beda59`](http://github.com/eggjs/egg/commit/341beda59ee99867998e28603f9ed623e49c33aa)] - test: mv assert to fixtures (#3829) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`79dbb14a5`](http://github.com/eggjs/egg/commit/79dbb14a535c27a55daf83b441b47aabff472b06)] - docs(logger): formatter (#3835) (TZ | 天猪 <<atian25@qq.com>>)

## 2019-07-17, Version 2.23.0 @atian25

### Notable changes

* **features**
  * error message rewrite when it has only a getter

* **fixes**
  * handleRequest method should return a promise
  * more log for bodyParser

* **docs**
  * httpclient upload files
  * typings improve

### Commits

  * [[`6bfc0eb5b`](http://github.com/eggjs/egg/commit/6bfc0eb5b9a6d38c73d46bf641ece6adda3481a1)] - feat: error message rewrite when it has only a getter (#3796) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`489f52b5c`](http://github.com/eggjs/egg/commit/489f52b5ce4078efccefc8837729b42c15828722)] - fix: handleRequest method should return a promise (#3820) (引证 <<browsnet@163.com>>)
  * [[`29a2f2fd9`](http://github.com/eggjs/egg/commit/29a2f2fd92e4d3e3cf0ee9ff034d8cdce07ee693)] - fix: more log for bodyParser (#3809) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`6dc8a2d14`](http://github.com/eggjs/egg/commit/6dc8a2d14582c774479593f002af2f2b96e0ce96)] - chore: fix ci (#3825) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`e30511eff`](http://github.com/eggjs/egg/commit/e30511effeb77d954e2c15b684c274b85da2c69b)] - docs: add alinode supported platforms (#3821) (hyj1991 <<yeekwanvong@gmail.com>>)
  * [[`c67ca2059`](http://github.com/eggjs/egg/commit/c67ca2059f2c44140e3a5bc46c38c87f52a08172)] - docs: open should come with protocol (#3787) (zhennann <<zhen.nann@icloud.com>>)
  * [[`9adcd40f8`](http://github.com/eggjs/egg/commit/9adcd40f81a22670abf2f5f9167d9c8de438ad34)] - docs(lifecyle): add class export in sample code (#3758) (Kermit Xuan <<33770367+Kermit-Xuan@users.noreply.github.com>>)
  * [[`4ca62734d`](http://github.com/eggjs/egg/commit/4ca62734db829cad7e3ea35bc6394de98c9ad160)] - fix: typos (#3768) (Jeff <<jeff.tian@outlook.com>>)
  * [[`b1cb5332d`](http://github.com/eggjs/egg/commit/b1cb5332d433c158f59ab4877f3f6ab07bf9fe79)] - chore: remove @types/urllib (#3732) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`3de31f541`](http://github.com/eggjs/egg/commit/3de31f5418503f02afde9e92409d5f40e664c46c)] - fix(typings): add custom logger typings (#3697) (吖猩 <<whxaxes@gmail.com>>)
  * [[`35af6331c`](http://github.com/eggjs/egg/commit/35af6331c97b2e9c9f831ff193709f8fc984f3a9)] - docs: https options en version (#3702) (liulun <<xland@live.cn>>)
  * [[`9c23232a4`](http://github.com/eggjs/egg/commit/9c23232a47679bdcb8f071a5cc01f013f443aa05)] - docs(sequelize): replace findById with findByPk (#3700) (Zhao zuoqi <<30346283+Mavericker-1996@users.noreply.github.com>>)
  * [[`3fccb4f27`](http://github.com/eggjs/egg/commit/3fccb4f275b2982b974a1a1d99cec32795f4efd3)] - docs: https options (#3701) (liulun <<xland@live.cn>>)
  * [[`5b2dbd5b0`](http://github.com/eggjs/egg/commit/5b2dbd5b097d80b0f9150d1a03ec1d9c73af8dec)] - test: fix some test methods failed on windows platform (#3686) (QingDeng <<zrl412@163.com>>)
  * [[`409990299`](http://github.com/eggjs/egg/commit/409990299fd3afeb35968bc06b02f4b0137718ba)] - fix：add the doc test on windows (#3654) (Maledong <<maledong_github@outlook.com>>)
  * [[`17fab1c1d`](http://github.com/eggjs/egg/commit/17fab1c1d645076bda76be351fcb3c6f86cea4ca)] - docs: httpclient upload files (#3682) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`da2d439d6`](http://github.com/eggjs/egg/commit/da2d439d6f79f767055021bf96f7ef73207a751a)] - docs（lifecyle): fix typo (#3681) (+v <<ljw@live.jp>>)

## 2019-04-30, Version 2.22.2 @atian25

### Notable changes

* **fixes**
  * optimize declaration of httpclient

### Commits

  * [[`670ba3475`](http://github.com/eggjs/egg/commit/670ba34751af0b3869dd656064b4587affb888ec)] - fix(typings): optimize declaration of httpclient (#3665) (吖猩 <<whxaxes@gmail.com>>)

## 2019-04-29, Version 2.22.1 @atian25

### Notable changes

* **fixes**
  * should restore agent messenger first

### Commits

  * [[`04adcf93b`](http://github.com/eggjs/egg/commit/04adcf93b8f0a8c48c35015e8d2a279fc7d06b24)] - fix: should restore agent messenger first (#3658) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`99eb75398`](http://github.com/eggjs/egg/commit/99eb7539850c117d3d8b05f669cae5a9e9269be8)] - docs: fix history time (#3655) (TZ | 天猪 <<atian25@qq.com>>)

## 2019-04-29, Version 2.22.0 @atian25

### Notable changes

* **features**
  * switch httpclient to httpclient2 for retry feature
  * add BaseHookClass

* **fixes**
  * loadCustomLoader should be run before loadCustomApp

* **docs**
  * d.ts for single mode

### Commits

  * [[`d3b1cb5d9`](http://github.com/eggjs/egg/commit/d3b1cb5d9d2dd91330778966ba9813f56476a47b)] - fix: loadCustomLoader should be run before loadCustomApp (#3652) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`7cc8aab02`](http://github.com/eggjs/egg/commit/7cc8aab02d89869b4ce460b2fa186aedcf00b64b)] - chore: update packages,remove 'plugin' and validations of doc generation (#3643) (Maledong <<maledong_github@outlook.com>>)
  * [[`bffb6448f`](http://github.com/eggjs/egg/commit/bffb6448f201ce0d61bd3a32b91f673cf5c074f4)] - docs: fix httpclient proxy (#3638) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`e7fbd68f3`](http://github.com/eggjs/egg/commit/e7fbd68f32054041b74bc860f11aca05c025c0a9)] - feat: switch httpclient to httpclient2 for retry feature (#3626) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`8bb7c7e7d`](http://github.com/eggjs/egg/commit/8bb7c7e7d59d6aeca4b2ed1eb580368dcb731a4d)] - feat: add BaseHookClass (#3581) (killa <<killa123@126.com>>)
  * [[`459454354`](http://github.com/eggjs/egg/commit/4594543543290a8c714fe3b9047c84578bf2f9a6)] - feat: index.d.ts添加单进程模式 (#3628) (jasine <<jasinechen@gmail.com>>)
  * [[`4b13a1ffb`](http://github.com/eggjs/egg/commit/4b13a1ffbed0895731bf38f72d5786d4b15f263f)] - chore: fix jsdocs (#3627) (TZ | 天猪 <<atian25@qq.com>>)

## 2019-04-12, Version 2.21.1 @dead-horse

### Notable changes

* **fixes**
  * Revert "feat: switch httpclient to httpclient2 for retry feature(which is a breaking change)

### Commits

  * [[`89872a76f`](http://github.com/eggjs/egg/commit/89872a76fc09cefb9ff92221a5c3b9977d206f7c)] - Revert "feat: switch httpclient to httpclient2 for retry feature (#36… (#3622) (Yiyu He <<dead_horse@qq.com>>)

## 2019-04-11, Version 2.21.0 @dead-horse

### Notable changes

* **features**
  * support config.maxProxyCount to help get the real client ip
  * switch httpclient to httpclient2 for retry feature

* **docs**
  * add how to config egg behind a proxy
  * update http_proxy usage
  * change `egg-init` to `npm init egg`

### Commits

  * [[`01b9588a3`](http://github.com/eggjs/egg/commit/01b9588a35ba33a7088e79f6d3e08c713c4de963)] - feat: support config.maxProxyCount to help get the real client ip (#3612) (Yiyu He <<dead_horse@qq.com>>)
  * [[`eead31862`](http://github.com/eggjs/egg/commit/eead318625347bb9de8f9d7ffc6fae5ae1b33901)] - feat: switch httpclient to httpclient2 for retry feature (#3606) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`879fe93a6`](http://github.com/eggjs/egg/commit/879fe93a6dde156101318c766a3c29ca07f1e18d)] - docs: add how to config egg behind a proxy (#3614) (Yiyu He <<dead_horse@qq.com>>)
  * [[`2357fbc1e`](http://github.com/eggjs/egg/commit/2357fbc1ee18cf0a8ee8692ed2d62d2224acfe3b)] - docs: remove egg-ts-helper && inspect-brk (#3603) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`e0a1d8fc6`](http://github.com/eggjs/egg/commit/e0a1d8fc6806acc0a4141bc4cf67149069bfbdf0)] - docs: change egg-init to `npm init egg` (#3588) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`763923cd7`](http://github.com/eggjs/egg/commit/763923cd76be30496fee9f733db9500c1d8188f2)] - chore: remove unused plugins.puml link (#3579) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`b1746468d`](http://github.com/eggjs/egg/commit/b1746468dae2d02aeef37f6e8d85414624c79880)] - docs(httpclient): update http_proxy usage (#3569) (TZ | 天猪 <<atian25@qq.com>>)


## 2019-03-25, Version 2.20.2 @whxaxes

### Notable changes

* **fixes**
  * onClientError remove content-length header

* **types**
  * add custom loader typing
  * import types from egg-core

### Commits

  * [[`f31cd38aa`](http://github.com/eggjs/egg/commit/f31cd38aa1c1cb58f4fb6b08020b0b49a9b5c1a8)] - fix(types): add custom loader typing (#3533) (吖猩 <<whxaxes@qq.com>>)
  * [[`a73cfd067`](http://github.com/eggjs/egg/commit/a73cfd067b48b2c2301e50d5ab431dfecebddef4)] - fix(types): import types from egg-core (#3545) (吖猩 <<whxaxes@qq.com>>)
  * [[`04adb930d`](http://github.com/eggjs/egg/commit/04adb930de61f6c3d1b7b9b4e7f49800e3b49602)] - fix: onClientError remove content-length header (#3544) (Yiyu He <<dead_horse@qq.com>>)

## 2019-03-12, Version 2.20.1 @dead-horse

### Notable changes

* **fixes**
  * empty querystring must be cached
  * add Singleton class declare typings

### Commits

  * [[`2fc241a86`](http://github.com/eggjs/egg/commit/2fc241a8648d64faab78196ccd0377c781287e5e)] - fix: add Singleton class declare typings (#3522) (mars <<marshalys@gmail.com>>)
  * [[`981bad58b`](http://github.com/eggjs/egg/commit/981bad58ba6c4644b8bbbd818a43bf0dd62e206f)] - fix: empty querystring must be cached (#3535) (Yiyu He <<dead_horse@qq.com>>)


## 2019-03-07, Version 2.20.0 @popomore

### Notable changes

* **features**
  * support customLoader

* **chore**
  * fix typo
  * fix testcase

### Commits

  * [[`4cf06da27`](http://github.com/eggjs/egg/commit/4cf06da272a3f71b864efb6780ddfe2e6c1ad37c)] - feat: support customLoader (#3484) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`2f2bd69bb`](http://github.com/eggjs/egg/commit/2f2bd69bb5a5ef5f9d45514c0640f3849bc64293)] - chore：Fix some typos in Chinese and English (#3514) (Maledong <<maledong_github@outlook.com>>)
  * [[`65bdd158c`](http://github.com/eggjs/egg/commit/65bdd158caf38abfc945de9aad8367a8567b1a18)] - Fix(cluster-client.test.js)：Rollback to previous (#3507) (Maledong <<maledong_github@outlook.com>>)

## 2019-02-28, Version 2.19.0 @dead-horse

### Notable changes

* **features**
  * single mode support ignore warning

* **fixes**
  * fix type defined

### Commits

  * [[`18efac152`](http://github.com/eggjs/egg/commit/18efac152dd5cf789d1e79b1c1fb1fb4ec2013a1)] - feat: single mode support ignore warning (#3501) (Yiyu He <<dead_horse@qq.com>>)
  * [[`f9eea2a4d`](http://github.com/eggjs/egg/commit/f9eea2a4da805a1b2f0e8883860266d68eb432ff)] - fix(types): getFileStream options types (#3500) (kayikay <<469797590@qq.com>>)

## 2019-02-26, Version 2.18.0 @dead-horse

### Notable changes

* **features**
  * cluster-client support single process mode

* **fixes**
  * fix type defined

### Commits

  * [[`db1093128`](http://github.com/eggjs/egg/commit/db10931281dd39106e5c657e358117abd39b2103)] - feat: cluster-client support single cpu mode (#3497) (zōng yǔ <<gxcsoccer@users.noreply.github.com>>)
  * [[`f7e6ab535`](http://github.com/eggjs/egg/commit/f7e6ab535df378b35dfe6b6b49d7e009dc2bcf3f)] - doc (typescript.md): Chinese translation for the beginning of TypeScript's Introduction (#3488) (Maledong <<maledong_github@outlook.com>>)
  * [[`ac7e9a6b6`](http://github.com/eggjs/egg/commit/ac7e9a6b6d732d946dc238d9bad3eaabb81a1b70)] - fix: helper type (#3483) (吖猩 <<whxaxes@qq.com>>)


## 2019-02-21, Version 2.17.0 @dead-horse

### Notable changes

* **features**
  * agent context can be extended

* **fixes**
  * createAnonymousContext add host in headers

### Commits
* [[`7147b23cf`](http://github.com/eggjs/egg/commit/7147b23cf7edaa98a8f009d98de7ef2aaa5303a0)] - feat: agent context can be extended (#3478) (Hongcai Deng <<admin@dhchouse.com>>)
* [[`a2f0d9620`](http://github.com/eggjs/egg/commit/a2f0d96204e05f11c5586ff0fa9441f4e3ab5dff)] - fix: createAnonymousContext add host in headers (#3477) (Yiyu He <<dead_horse@qq.com>>)
* [[`5952d1240`](http://github.com/eggjs/egg/commit/5952d12404ae896a2338ee4ee79d68876ffbb205)] - docs(typescript): fix wrong path of LifeCycle (#3475) (CHANG, TZU-YEN <<try_love_tom@icloud.com>>)

## 2019-02-18, Version 2.16.2 @dead-horse

### Notable changes

* **fixes**
  * fix: messenger in single process mode support send without `to`

### Commits

  * [[`eac494184`](http://github.com/eggjs/egg/commit/eac4941846948ca6bb8a357d525ad82737425005)] - fix: support send without to argument (#3472) (Yiyu He <<dead_horse@qq.com>>)


## 2019-02-15, Version 2.16.1 @atian25

### Notable changes

* **docs**
  * remove declaration of view

* **others**
  * update dependencies

### Commits

  * [[`1e859f2e2`](http://github.com/eggjs/egg/commit/1e859f2e200260cab95ac0b860d85609eb3eec06)] - feat(types): remove declaration of view (#3466) (吖猩 <<whxaxes@qq.com>>)
  * [[`4a3ab5ac0`](http://github.com/eggjs/egg/commit/4a3ab5ac0324537fc3cdbcc0e84e3085b8a34586)] - deps: update dependencies (#3464) (Yiyu He <<dead_horse@qq.com>>)

## 2019-02-14, Version 2.16.0 @dead-horse

### Notable changes

* **features**
  * allow ctx.router setter

* **others**
  * more document improvement

### Commits

  * [[`0b67c85f6`](http://github.com/eggjs/egg/commit/0b67c85f6f1798b2d3f377fb5ea336c96b60b6e3)] - feat: allow ctx.router setter (#3460) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`ae5f56f3e`](http://github.com/eggjs/egg/commit/ae5f56f3e9b60eaa3507db44736020f3a13ec6f1)] - chore: Add principles for English titles and change all English titles (#3444) (Maledong <<maledong_github@outlook.com>>)
  * [[`a9bee07da`](http://github.com/eggjs/egg/commit/a9bee07daff1530da7350f9ad1ea56e21aa3eead)] - docs(sequelize): fix init doc (#3456) (Yiyu He <<dead_horse@qq.com>>)
  * [[`f76c23052`](http://github.com/eggjs/egg/commit/f76c23052c86afcf158087f8b13a7e47ef76f67c)] - docs(logger): add logger.outputJSON to docs (#3425) (FX <<friskfly@gmail.com>>)


## 2019-02-04, Version 2.15.1 @dead-horse

### Notable changes

* **fixes**
  * add missing framework support for single process mode

### Commits

  * [[`277c024cf`](http://github.com/eggjs/egg/commit/277c024cf565948547dbc7a518d39d7f55318f58)] - fix: add missing framework support for single process mode (#3445) (Yiyu He <<dead_horse@qq.com>>)

## 2019-02-03, Version 2.15.0 @dead-horse

### Notable changes

* **features**
  * [EXPERIMENT FEATURE] support single process mode

* **fixes**
  * [TYPE] array supporting for config.static.dir
  * [TYPE] fix IMiddleware type is incompatible
  * [TYPE] fix type error while esModuleInterop is true

* **others**
  * more document improvement

### Commits

  * [[`83c423a0a`](http://github.com/eggjs/egg/commit/83c423a0a985e701bfaef7f10372268b4ce8cef5)] - docs(development.md): Add English translation (Jennie <<jennie.ji@hotmail.com>>)
  * [[`d79da17bd`](http://github.com/eggjs/egg/commit/d79da17bdbe94f7b78d923caa10abf21e6c5f752)] - fix: type error while esModuleInterop is true (#3436) (吖猩 <<whxaxes@qq.com>>)
 * [[`20ba4632b`](http://github.com/eggjs/egg/commit/20ba4632ba32e3b81e760678b4bbe00cdf05388e)] - feat: support single process mode (#3430) (Yiyu He <<dead_horse@qq.com>>)
  * [[`133616961`](http://github.com/eggjs/egg/commit/133616961e5a2e95d5e2cd1254d7304c846b859c)] - docs: fix typo in socketio.md (#3431) (kilmas <<kilmas@qq.com>>)
  * [[`e899630e9`](http://github.com/eggjs/egg/commit/e899630e97865701b81d428686a19288b1c87b98)] - fix: array supporting for config.static.dir (#3421) (Gray <<njugray@gmail.com>>)
  * [[`43f2e3c44`](http://github.com/eggjs/egg/commit/43f2e3c449a7b448506d2484ed729618b06bffec)] - fix: IMiddleware type is incompatible (#3419) (吖猩 <<whxaxes@qq.com>>)
  * [[`b3256b54e`](http://github.com/eggjs/egg/commit/b3256b54eeb09b2cee3cfdb75e98d6c090844a10)] - doc：Add new loaderUpdate.md (#3395) (Maledong <<maledong_github@outlook.com>>)
  * [[`71768002a`](http://github.com/eggjs/egg/commit/71768002a468a8fd30b9516c0bed85fa27b99b0a)] - docs: Wrong words are corrected (#3418) (巧克力冰激凌 <<121017405@qq.com>>)
  * [[`20d56c7a8`](http://github.com/eggjs/egg/commit/20d56c7a83a74bb81ee47b0b8c2785db15519996)] - fix: fix ts ci (#3416) (吖猩 <<whxaxes@qq.com>>)
  * [[`8beacd13e`](http://github.com/eggjs/egg/commit/8beacd13e3bcfff6b6a1e02eea72cafdd343858c)] - docs(logger): add logger.disableConsoleAfterReady to docs (#3384) (吖猩 <<whxaxes@qq.com>>)
  * [[`271bc6372`](http://github.com/eggjs/egg/commit/271bc63722723531556bbec06d621f964ad1db33)] - chore: typo "submit an PR" should be "submit a PR" (#3408) (DAI JIE <<daijie@php.net>>)
  * [[`688f67c9f`](http://github.com/eggjs/egg/commit/688f67c9f329c71ea4469b9d28d5ee41815831ed)] - Chore: Fix some chore issues (#3400) (Maledong <<maledong_github@outlook.com>>)
  * [[`cfcebc623`](http://github.com/eggjs/egg/commit/cfcebc6234c62780c6aecf84db3862efd74e430c)] - doc (typescript.md): Sync the English translation (#3397) (Maledong <<maledong_github@outlook.com>>)
  * [[`7e5ef2181`](http://github.com/eggjs/egg/commit/7e5ef21811f98e5d55884f2574092e6f2e7b619b)] - docs(typescript): optimize docs of typescript (#3374) (吖猩 <<whxaxes@qq.com>>)
  * [[`2a801f789`](http://github.com/eggjs/egg/commit/2a801f789f6e60427657b507951de8fc8e4a830f)] - chore: comments typo fix (#3392) (Jeff <<jeff.tian@outlook.com>>)
  * [[`9a4b72062`](http://github.com/eggjs/egg/commit/9a4b7206212a27d37a37a1d68b4739be306b1a7a)] - chore: fix issue template (#3369) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`ef73396a5`](http://github.com/eggjs/egg/commit/ef73396a5828c6b4e55c85cd2b27c3830bd306e5)] - docs: improve debug docs (#3370) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`874e57fda`](http://github.com/eggjs/egg/commit/874e57fda480d3295c1b1b30198ca3493f57814d)] - docs(sequelize): fix init (#3372) (Yiyu He <<dead_horse@qq.com>>)
  * [[`b2152c56f`](http://github.com/eggjs/egg/commit/b2152c56f525a87fe0c1cfe66949005f308e1569)] - Chore: Fix some typo translations (#3361) (Maledong <<maledong_github@outlook.com>>)
  * [[`d275929d1`](http://github.com/eggjs/egg/commit/d275929d17830c95a2c828611b5ca54ffb747270)] - docs(boot): update app start document (#3348) (Yiyu He <<dead_horse@qq.com>>)
  * [[`9a8652beb`](http://github.com/eggjs/egg/commit/9a8652bebc29f3d097039196b10daa2575f49695)] - Fix: Change the diagram of "starting process" (#3358) (Maledong <<maledong_github@outlook.com>>)
  * [[`ac0f13bc6`](http://github.com/eggjs/egg/commit/ac0f13bc604ebfc08185b336a106ec7e5d1bc98f)] - Chore: Add missing links for "Sails" and union the spellings of "Plugin" (#3356) (Maledong <<maledong_github@outlook.com>>)
  * [[`cd52b063b`](http://github.com/eggjs/egg/commit/cd52b063b60e15bc78c440fdebc00ddd3dca9909)] - docs(cluster-and-ipc.md): fix typos and formatting errors (#3357) (Darren Poon <<dyhpoon@gmail.com>>)
  * [[`37e3c1aba`](http://github.com/eggjs/egg/commit/37e3c1abab31f47fc492574464657a57ff686b2b)] - Chroe: Fix something in articles (#3349) (Maledong <<maledong_github@outlook.com>>)

## 2018-12-20, Version 2.14.2 @atian25

### Notable changes

* **fixes**
  * fix d.ts context declaration not works

* **docs**
  * more document improvement

### Commits
  * [[`edfe66093`](http://github.com/eggjs/egg/commit/edfe66093c9ffe730ffd9804da1e2b264a48c38e)] - fix: Add comments for re-writing properties from Koa (#3332) (Maledong <<maledong_github@outlook.com>>)
  * [[`f312db78f`](http://github.com/eggjs/egg/commit/f312db78fc330da2bfe6efdb0f095d7b3b363beb)] - fix: fix context declaration not works (#3329) (Axes <<whxaxes@qq.com>>)
  * [[`ef47a2746`](http://github.com/eggjs/egg/commit/ef47a274625a6ae8696857bef01b2c679dd65395)] - docs: fix config heading level (#3327) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`cddd91ded`](http://github.com/eggjs/egg/commit/cddd91ded2fac1395487e2847caaf92afaafcf8e)] - chore: adjust template (TZ <<atian25@qq.com>>)
  * [[`7319727a0`](http://github.com/eggjs/egg/commit/7319727a0b8a4fa210746ac201631a4b7db4359b)] - chore: Update issue templates (#3326) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`0cb246e26`](http://github.com/eggjs/egg/commit/0cb246e2663a288395a013ee78a1b34ab5b7c641)] - doc: Fix some translations with some icons (#3315) (Maledong <<maledong_github@outlook.com>>)
  * [[`9dc20377e`](http://github.com/eggjs/egg/commit/9dc20377e18e53278bcfac037e15a5a761cccdb3)] - doc: session special usage tip (#3304) (Jerry Wu <<perzy_wu@163.com>>)
  * [[`6f4e91274`](http://github.com/eggjs/egg/commit/6f4e91274daa0685ba0ed8983ad5b6fd457322bc)] - docs: Update httpclient.md (#3276) (Albert <<shuaizhexu@gmail.com>>)
  * [[`64e88abfd`](http://github.com/eggjs/egg/commit/64e88abfd24d50096aa2d4ef442aafd46101429a)] - docs(egg-passport): add redirection desc while auth succeed (#3260) (Suyi <<thonatos@users.noreply.github.com>>)

## 2018-11-24, Version 2.14.1 @atian25

### Notable changes

* **fixes**
  * remove timeout log msg

* **others**
  * use circular-json-for-egg to remove deprecate message

### Commits

  * [[`0fb5a96c0`](http://github.com/eggjs/egg/commit/0fb5a96c023e916cb9c14c5960df62547ed391d8)] - fix: remove timeout log msg (#3229) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`de81caef1`](http://github.com/eggjs/egg/commit/de81caef1d91c229effadd25ddf752297c2a08f5)] - deps: use circular-json-for-egg to remove deprecate message (#3211) (Yiyu He <<dead_horse@qq.com>>)

## 2018-11-17, Version 2.14.0 @dead-horse

### Notable changes

* **features**
  * add create anonymous context to agent
  * support server timeout

* **fixes**
  * curl: allow request timeout bigger than agent timeout
  * triggerServerDidReady should be triggered only once

### Commits

  * [[`db999d3f7`](http://github.com/eggjs/egg/commit/db999d3f7afa210c855f3f1a4518e83f7d8c1dc6)] - docs: add serverTimeout to d.ts (#3200) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`a43fef4e1`](http://github.com/eggjs/egg/commit/a43fef4e1828937d3d84469989582df273de1493)] - docs(index.d.ts): curl 增加泛型 (#3197) (The Rock <<simonzhong0924@gmail.com>>)
  * [[`d40124a25`](http://github.com/eggjs/egg/commit/d40124a25fcd1b52ab862ee297139a022458b81d)] - feat: add create anonymous context to agent (#3193) (Hongcai Deng <<admin@dhchouse.com>>)
  * [[`9dfd19ead`](http://github.com/eggjs/egg/commit/9dfd19eada8bae7be212155a2989d0ccc410e8eb)] - fix: triggerServerDidReady should be triggered only once (#3190) (killa <<killa123@126.com>>)
  * [[`7802528e1`](http://github.com/eggjs/egg/commit/7802528e122691eb2cb78174e1c1490d0a382c08)] - feat: support server timeout (#3133) (TZ |
天猪 <<atian25@qq.com>>)
  * [[`ff79101b5`](http://github.com/eggjs/egg/commit/ff79101b592d59ad12d110dd26dd7fa3d044b968)] - docs: Update service.md (#3191) (肖金 <<xiaojin1992@126.com>>)
  * [[`327fa174f`](http://github.com/eggjs/egg/commit/327fa174ffd74a67a77520d839eac282c916e8c0)] - fix: allow request timeout bigger than agent timeout (#3146) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`86093c03a`](http://github.com/eggjs/egg/commit/86093c03a822a2b925de94cfda96198dc8159ade)] - docs: remove promo logo (#3176) (Suyi <<thonatos@users.noreply.github.com>>)

## 2018-11-07, Version 2.13.0 @mansonchor

### Notable changes

* **feature**
  * emit event when runInBackground catch error

* **perf**
  * better TypeScript support

* **docs**
  * supplement documentation


### Commits

  * [[`03378b8c3`](https://github.com/mansonchor/egg.git/commit/03378b8c3e48e7000a580a4acf5375f9ffcac4dc)] - docs(plugin.md): fix 'path' declaration example (#3152) (maigozhang <<zhangsnxiang@126.com>>)
  * [[`3c25221bd`](https://github.com/mansonchor/egg.git/commit/3c25221bd24a0a39cd06540fad46884e4dda363c)] - chore: use is.string() in utils.js for consistency (#3153) (ZYSzys <<zyszys98@gmail.com>>)
  * [[`a9b0fcec6`](https://github.com/mansonchor/egg.git/commit/a9b0fcec636f7241d0f578dca6b99444dabfeb83)] - chore(typings): add method `beforeClose` in index.d.ts (#3120) (Erona <<erona@loli.bz>>)
  * [[`4709db746`](https://github.com/mansonchor/egg.git/commit/4709db746d8f97de99c04558f1ba86443e394668)] - feature(context): emit event when runInBackground catch error (#3118) (mansonchor <<mansonchor@126.com>>)
  * [[`e1dc2a7a4`](https://github.com/mansonchor/egg.git/commit/e1dc2a7a409a8bf56a817773229d5fc6dcde796b)] - docs: add promo logo (#3113) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`51e9c1578`](https://github.com/mansonchor/egg.git/commit/51e9c1578496ed2afb44c47fdfd77867a95fec52)] - chore(typings): add interface IBoot (#3098) (killa <<killa123@126.com>>)
  * [[`8052d7ff7`](https://github.com/mansonchor/egg.git/commit/8052d7ff7bf6278e8ce4b4de46e0e6324d0d3861)] - doc: Update the `configWillLoad` explainations (#3116) (Maledong <<maledong_github@outlook.com>>)
  * [[`c3c4e2e3e`](https://github.com/mansonchor/egg.git/commit/c3c4e2e3e04a924595d6837ab15c7b292e3529f6)] - docs: add configWillLoad to lifecycle (#3101) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`4abdb4980`](https://github.com/mansonchor/egg.git/commit/4abdb49801ebb3075b408d6fb3b72eba1a70c056)] - docs(CONTRIBUTION): Add missing link for `Accquire the submitted files` (#3102) (Maledong <<maledong_github@outlook.com>>)
  * [[`c7061ec62`](https://github.com/mansonchor/egg.git/commit/c7061ec6255faa250c6565a4c102f64c0498683c)] - fix(docs): Grammar of "lots of" (#3100) (waiting <<waiting@xiaozhong.biz>>)
  * [[`92181e83f`](https://github.com/mansonchor/egg.git/commit/92181e83f98d55bd1a796a871ab5d438d02c8e84)] - doc (CONTRIBUTION): Add missing English translations and clearify dns (#3035) (Maledong <<maledong_github@outlook.com>>)
  * [[`0a7497987`](https://github.com/mansonchor/egg.git/commit/0a7497987067ce1c3376dfc30676c35f484a5ccc)] - doc(logger.md): Fix incorrect description on default log output level. (#3082) (TX-Kunkun <<eiclkun@gmail.com>>)


## 2018-10-08, Version 2.12.0 @dead-horse

### Notable changes

* **feature**
  * add Subscription base class on app instance

* **fix**
  * upgrade to egg-logger@2, don't write log when stream was destroyed.
  * pin circular-json@0.5.5 to avoid output deprecate message

* **docs**
  * corrected lots of documentation errors, thanks @Maledong
  * use egg-logger definition


### Commits

  * [[`eb1eae736`](http://github.com/eggjs/egg/commit/eb1eae736c0fc541e6d21fb726d52d971d6a95da)] - refactor(typescript): use egg-logger definition (#3078) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`04d9a3b85`](http://github.com/eggjs/egg/commit/04d9a3b85ef54819c0ad3ac505e7806db6a7e9b3)] - deps: egg-logger@2 (#3073) (Yiyu He <<dead_horse@qq.com>>)
  * [[`886d9ad8f`](http://github.com/eggjs/egg/commit/886d9ad8fd11e1fbbd1712dd53ef464658f525b5)] - feat: add Subscription base class on app instance (#3058) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`4c6fb2a17`](http://github.com/eggjs/egg/commit/4c6fb2a175c2481aa61aaad131f6812517bc7022)] - doc (socket.io): Make 'uws' cannot use anymore clear (#3068) (Maledong <<maledong_github@outlook.com>>)
  * [[`0d6798d22`](http://github.com/eggjs/egg/commit/0d6798d22d0e5016b0f7f25e5fa15ffe6900e16c)] - docs (Controller.md): Add new feat description (#3066) (Maledong <<maledong_github@outlook.com>>)
  * [[`399902680`](http://github.com/eggjs/egg/commit/39990268081d1da3fdb2d575802ea46cdf67bcd5)] - doc(typescript.md): Clarify the middleware's usages (#3039) (Maledong <<maledong_github@outlook.com>>)
  * [[`6bf812f73`](http://github.com/eggjs/egg/commit/6bf812f73603e967e405a815dcb2cc94dcb8384c)] - chore: fix middleware docs typo (#3060) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`b13d904d3`](http://github.com/eggjs/egg/commit/b13d904d302639c3b6068f109d4bcfa5aff12c61)] - test: avoid DNS pollution on local env (#3034) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`bace2433b`](http://github.com/eggjs/egg/commit/bace2433bcc96d1507403c34711b2a2e450e6a6a)] - fix: remove loader.loadBootHook (Yiyu He <<dead_horse@qq.com>>)
  * [[`6a7db2a35`](http://github.com/eggjs/egg/commit/6a7db2a3591a03b187bc3b52c67b37fde7984d34)] - doc (objects.md): Fix number and code errors (#3029) (Maledong <<maledong_github@outlook.com>>)
  * [[`c65a64899`](http://github.com/eggjs/egg/commit/c65a648991900b95a8ef0b21dcd8e3f715523df7)] - doc (TypeScript): Formation errors with missing translations (#3020) (Maledong <<maledong_github@outlook.com>>)
  * [[`abd8d1286`](http://github.com/eggjs/egg/commit/abd8d12861e17ff8fe5e950d589c00d17625beae)] - deps: pin circular-json@0.5.5 to avoid output deprecate message (#3023) (Yiyu He <<dead_horse@qq.com>>)
  * [[`e3ffcbe64`](http://github.com/eggjs/egg/commit/e3ffcbe6449b95b50ea40583a28383e734c72fe1)] - docs (typescript.md): Add missing trans in English for TypeScript (#2998) (Maledong <<maledong_github@outlook.com>>)

## 2018-09-19, Version 2.11.2 @XadillaX

### Notable changes

* **fix**
  * typescript: add missing 'ignore', 'match'
* **refactor**
  * separate dumping config object and config file

### Commits

  * [[`1d30166e0`](http://github.com/eggjs/egg/commit/1d30166e037e8890fc850e51bdba02af76772485)] - refactor: separate dumping config object and config file (#3014) (Khaidi Chu <<i@2333.moe>>)
  * [[`e3f183e96`](http://github.com/eggjs/egg/commit/e3f183e9658e603c74850376f2257bd88bc4a043)] - fix (typescript): Add missing 'ignore','match' (#3010) (Maledong <<maledong_github@outlook.com>>)

## 2018-09-14, Version 2.11.1 @popomore

### Notable changes

* **fix**
  * httpclient: can't use runInBackground in agent

* **deps**
  * upgrade to debug@4 and coffee@5

### Commits

  * [[`eed74e861`](http://github.com/eggjs/egg/commit/eed74e8610e1ea189beed1c3526b38f0b59c48ab)] - chore: update deps, debug@4 and coffee@5 (#2995) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`a8a3dfb04`](http://github.com/eggjs/egg/commit/a8a3dfb04f11b1c48ed1f01154e4d4311bfafa4b)] - fix(httpclient): can't use runInBackground in agent (#3003) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`4faf68f4b`](http://github.com/eggjs/egg/commit/4faf68f4b6dad160a151b3d76041a0521261b530)] - doc (loader.md): Add missing English translations (#2996) (Maledong <<maledong_github@outlook.com>>)

## 2018-09-11, Version 2.11.0 @atian25

### Notable changes

* **feature**
  * support boot lifecycle, see https://github.com/eggjs/egg/issues/2520
  * `dnshttpclient` now use async function instead of Promise

* **fix**
  * don't log when rawPacket is empty

* **docs**
  * add sequelize guide docs
  * more document and typings improvement

### Commits

  * [[`0d876c71a`](http://github.com/eggjs/egg/commit/0d876c71a9c4862b93cb039f564ae3d3171e1cad)] - feat: support boot lifecyle (#2972) (killa <<killa123@126.com>>)
  * [[`b02ce1547`](http://github.com/eggjs/egg/commit/b02ce154777fc78a6d344fe45d915d013096bea3)] - chroe(doc): Fix some typos (#2988) (Maledong <<maledong_github@outlook.com>>)
  * [[`688067ae0`](http://github.com/eggjs/egg/commit/688067ae09071316cbf5310b17d92d4fec39b42a)] - docs: fix 2 typos (#2982) (Jeff <<jeff.tian@outlook.com>>)
  * [[`a719fd345`](http://github.com/eggjs/egg/commit/a719fd34507ebbfcf800768fb58adc81aa9c5e36)] - docs: Fix and add missing typos (#2935) (Maledong <<maledong_github@outlook.com>>)
  * [[`815c27879`](http://github.com/eggjs/egg/commit/815c278792e94ccf85822b3496f10396236e6628)] - fix (typings): Upgrade to the latest version of 'egg-cookie' to fetch (#2958) (Maledong <<maledong_github@outlook.com>>)
  * [[`a2df5ad13`](http://github.com/eggjs/egg/commit/a2df5ad137dea5faf7724d480edcc482a1df9393)] - docs: fixed typo. (#2961) (Ariel Yang <<arielyang@gmail.com>>)
  * [[`b971e6633`](http://github.com/eggjs/egg/commit/b971e66336af4c8e241303866c8fa9acaaf4e66f)] - test: fix sitefile icon test (#2940) (Yiyu He <<dead_horse@qq.com>>)
  * [[`81826ed1a`](http://github.com/eggjs/egg/commit/81826ed1a826a3436f8c42b7b5466295c60f241e)] - docs: fix link to angular commit-message-format (#2939) (Vincent <<santochance@users.noreply.github.com>>)
  * [[`45e302459`](http://github.com/eggjs/egg/commit/45e30245952619e4ed95867b2f76b0bdd06e94cc)] - fix: don't log when rawPacket is empty (#2924) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`db1286de7`](http://github.com/eggjs/egg/commit/db1286de73de2cd987dc8f28c0616e9a683824a6)] - chore(typings): add class EggLoader (#2321) (waiting <<waiting@xiaozhong.biz>>)
  * [[`80528ccec`](http://github.com/eggjs/egg/commit/80528cceced500b5ae49ebf6d9df242ba2ce5ea4)] - refactor(dnshttpclient): use async function instead of Promise (#2774) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`fe9e95654`](http://github.com/eggjs/egg/commit/fe9e9565472c7de9ff8dfb8894917764fe26fa0b)] - doc (package.json,README.zh-CN): Fix some typos (#2927) (Maledong <<maledong_github@outlook.com>>)
  * [[`289e96278`](http://github.com/eggjs/egg/commit/289e96278359a1468e366a6f3f7b2094dd3b7d6c)] - docs(sequelize): hostname shoule be host (#2921) (Will <<1078954008@qq.com>>)
  * [[`72cd808b8`](http://github.com/eggjs/egg/commit/72cd808b86f37847cf340d88ec4eb73b9d7a7aa0)] - docs: fix sequelize link (#2909) (Yiyu He <<dead_horse@qq.com>>)
  * [[`ae9ec30b4`](http://github.com/eggjs/egg/commit/ae9ec30b410bba3f8a99ba741e59fdb13e51c806)] - docs: add sequelize (#2902) (Yiyu He <<dead_horse@qq.com>>)
  * [[`68135608b`](http://github.com/eggjs/egg/commit/68135608b3518b7d3dbd852453061179f63d5e4f)] - docs(deployment): fix typo on grep (#2898) (Baffin Lee <<baffinlee@gmail.com>>)
  * [[`6bfe70b3d`](http://github.com/eggjs/egg/commit/6bfe70b3d64206c85dea19c308abb40c46c6e347)] - doc (en,zh-cn): Fix translations error (#2885) (Maledong <<maledong_github@outlook.com>>)
  * [[`96ed020ce`](http://github.com/eggjs/egg/commit/96ed020ce04919049181808cee217029586d11c3)] - docs: fix config and socketio error (#2884) (Suyi <<thonatos@users.noreply.github.com>>)


## 2018-08-06, Version 2.10.0 @fengmk2

### Notable changes

* **feature**
  * allow runInBackground reuse on plugins
  * use Math.floor instead of parseInt

* **fix**
  * use cache-content-type

* **docs**
  * add lifecycle doc
  * add sequelize guide
  * add allowDebugAtProd in document
  * egg-scripts support windows
  * schedule add env description
  * more document and typings improvement

### Commits

  * [[`ff7431d5c`](http://github.com/eggjs/egg/commit/ff7431d5c4ea1e1d40fd7e3656dc5ab52ca55726)] - feat: allow runInBackground reuse on plugins (#2872) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`422b342b1`](http://github.com/eggjs/egg/commit/422b342b1fa419db145323927f4f2d2a8996b7fb)] - feat: Update index.d.ts (#2853) (Ben <<ben@zfben.com>>)
  * [[`2ca8f0184`](http://github.com/eggjs/egg/commit/2ca8f018473274fa544234c91fc608fa9bf09032)] - feat(typings): define Messenger['on'] and Messenger['once'] (#2763) (waiting <<waiting@xiaozhong.biz>>)
  * [[`9f8926d7c`](http://github.com/eggjs/egg/commit/9f8926d7cc55ae103b6a37751538870cc70aa12d)] - fix: use cache-content-type (#2793) (Yiyu He <<dead_horse@qq.com>>)
  * [[`033fe0ce1`](http://github.com/eggjs/egg/commit/033fe0ce1d39bd63346de1ec60c97b159be867aa)] - docs: optimize egg-validate usage (#2852) (Sean Zou <<405495715@qq.com>>)
  * [[`c0b0bb834`](http://github.com/eggjs/egg/commit/c0b0bb8345df83bbd2949b0af34bb397b5185e17)] - docs(session): fix bug in example code of modify session value (#2824) (Baffin Lee <<baffinlee@gmail.com>>)
  * [[`b55b303ed`](http://github.com/eggjs/egg/commit/b55b303eddbaf545cdb06fd81df624fd3070110a)] - test: test on travis with node 10 (#2461) (Yiyu He <<dead_horse@qq.com>>)
  * [[`38a472f24`](http://github.com/eggjs/egg/commit/38a472f24cf68acb9c64fafa2e4374115d578220)] - docs: add allowDebugAtProd in document (#2803) (Yiyu He <<dead_horse@qq.com>>)
  * [[`e86669937`](http://github.com/eggjs/egg/commit/e866699379bc570f8bfcef9a090f1bdb5cddee32)] - perf: use Math.floor instead of parseInt (Eason <<tobewhatwewant@gmail.com>>)
  * [[`67d538e0e`](http://github.com/eggjs/egg/commit/67d538e0e175e96fe2a64b9c8d17b063537236f7)] - docs(plugin): add details for plugin.js (#2780) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`8d0b29cc9`](http://github.com/eggjs/egg/commit/8d0b29cc9b0a3b8eefad1ab64a05478c81709144)] - docs(deployment): egg-scripts support windows (#2788) (Baffin Lee <<baffinlee@gmail.com>>)
  * [[`aaf8faf4f`](http://github.com/eggjs/egg/commit/aaf8faf4fd8d813c7938baa1533d768b9d205fc7)] - test: skip test (#2773) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`eb70335bd`](http://github.com/eggjs/egg/commit/eb70335bd61b6887ffeb33f103340b89c857312a)] - docs(schedule): add env description (#2753) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`ef20ff756`](http://github.com/eggjs/egg/commit/ef20ff75633b6e83b115d32af603d0f4f34cb1e1)] - docs: add http://www.sofastack.tech (#2752) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`1ecb521c5`](http://github.com/eggjs/egg/commit/1ecb521c50b6238397f9a0b628448c0d2b5ec4fa)] - doc: add lifecyle doc (#2708) (killa <<killa123@126.com>>)
  * [[`7930f0419`](http://github.com/eggjs/egg/commit/7930f0419fee741bcf6de73693bcdf1e9986f31e)] - docs: fix ws engine error (#2717) (Suyi <<thonatos@users.noreply.github.com>>)

## 2018-06-14, Version 2.9.1 @dead-horse

### Notable changes

* **perf**
  * improve set type performance

* **docs**
  * fix socketio's browser demo
  * add Messenger in tsd

### Commits

  * [[`1a820bd44`](http://github.com/eggjs/egg/commit/1a820bd4408b36cf3e48eda62f392006081c17a3)] - perf: improve set type performance by lru cache (#2697) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`239ce03ef`](http://github.com/eggjs/egg/commit/239ce03efaf60d3d961ced29cf4bf95e44bde2db)] - docs: fix socketio's browser demo (#2645) (xcold <<lxstart@outlook.com>>)
  * [[`73ca1b7a3`](http://github.com/eggjs/egg/commit/73ca1b7a3ef6546d4f8a3d227055121a93b80188)] - chore(typings): add Messenger (#2688) (waiting <<waiting@xiaozhong.biz>>)

## 2018-06-01, Version 2.9.0 @popomore

### Notable changes

* **feature**
  * dump timing data for loader

* **fix**
  * the default value of config.allowDebugAtProd is false
  * make definition of app.locals and ctx.locals definitions merge available
  * add key any to Context in typescript define

* **docs**
  * more document improvement

### Commits

 * [[`e5737d545`](http://github.com/eggjs/egg/commit/e5737d5455d536b908f37ba367446e511f30e663)] - fix: add key any to Context (#2650) (Axes <<whxaxes@qq.com>>)
 * [[`65a43aa9e`](http://github.com/eggjs/egg/commit/65a43aa9e47ad2f799e328e4e0ab91a63669c5e3)] - feat: dump timing data for loader (#2521) (#2621) (Haoliang Gao <<sakura9515@gmail.com>>)
 * [[`48c6d3c9d`](http://github.com/eggjs/egg/commit/48c6d3c9d524e1cbba3e301e6613436741696cc0)] - fix: typo (#2615) (Yanan Che <<cynosurech@gmail.com>>)
 * [[`c91e67cc0`](http://github.com/eggjs/egg/commit/c91e67cc0246a22efee126ebd01866b05b8312dc)] - docs(logger): the unit of maxFileSize should be byte (#2575) (Haoliang Gao <<sakura9515@gmail.com>>)
 * [[`26c274174`](http://github.com/eggjs/egg/commit/26c274174c9a48ef1636933fbb2be9777d38f522)] - docs: tweek doc style (#2613) (Haoliang Gao <<sakura9515@gmail.com>>)
 * [[`3ee7fcf12`](http://github.com/eggjs/egg/commit/3ee7fcf1291a4968197fab4648e951176dfa2714)] - docs: fix quickstart typo error (#2578) (Zhuxy <<ghostcode521@gmail.com>>)
 * [[`8b7c8bd35`](http://github.com/eggjs/egg/commit/8b7c8bd35f8695f4459cfd623f9961c276e0d5a6)] -  docs(d.ts): add property of EggAppConfig.development (#2561) (SinaVee <<sinalvee@gmail.com>>)
 * [[`16a61231d`](http://github.com/eggjs/egg/commit/16a61231d12c91ae609e68509d29aac669e1b83c)] - docs: add d.ts for bodyparser (#2548) (wangtao0101 <<yuecjn@gmail.com>>)
 * [[`e7696a7d2`](http://github.com/eggjs/egg/commit/e7696a7d2b4bc8eb6fb984aaaa0e0f2422d1c048)] - fix(d.ts): make app.locals and ctx.locals definitions merging available (#2546) (Tony Hawking <<ThaGKI9@outlook.com>>)
 * [[`e5d47524e`](http://github.com/eggjs/egg/commit/e5d47524ef96138172c86e774014a6b26d5cac09)] - chroe: Correct an error syntax of English (#2544) (DongWei <<maledong_forwork@foxmail.com>>)
 * [[`c0f4bd12d`](http://github.com/eggjs/egg/commit/c0f4bd12d422554351b1d1e9866a7b9bbc444e76)] - fix: config.allowDebugAtProd default to false (ZhangJan <<dsonet@msn.com>>)
 * [[`0723cd230`](http://github.com/eggjs/egg/commit/0723cd230514b623c4454120dae988fd5a68ec44)] - docs(cookie): how to get frontend cookie (#2542) (Yiyu He <<dead_horse@qq.com>>)
 * [[`9fea64ee9`](http://github.com/eggjs/egg/commit/9fea64ee993de7c3ee2e239d7bba91f5f3b3408a)] - docs: Fix an error link, change a comment into English (#2535) (DongWei <<maledong_forwork@foxmail.com>>)
 * [[`e96ddb6a8`](http://github.com/eggjs/egg/commit/e96ddb6a884ef767c8653242c666dcc7381222b7)] - docs: Modifications of comments and full translations (DongWei <<maledong_forwork@foxmail.com>>)

## 2018-05-05, Version 2.8.1 @atian25

### Notable changes

* **docs**
  * fix missing d.ts

### Commits

  * [[`20356bffc`](http://github.com/eggjs/egg/commit/20356bffcf7e99970b44f230a6fc2a8f9547a380)] - feat(d.ts): add createAnonymousContext & runInBackground (#2501) (Hengfei Zhuang <<zhuanghengfei@gmail.com>>)
  * [[`c013ef3e6`](http://github.com/eggjs/egg/commit/c013ef3e64e049c6ef48e29d289f6d756b6ca1f7)] - feat(d.ts): add runSchedule & Subscription define (#2504) (Hengfei Zhuang <<zhuanghengfei@gmail.com>>)

## 2018-05-03, Version 2.8.0 @dead-horse

### Notable changes

* **feature**
  * add time duration for dump config

* **fix**
  * make singleton work for unextensible or frozen instance

* **docs**
  * switch to English document
  * add middleware to Application and other ts improvement (typescript)
  * update wxapp-socket-io project to weapp.socket.io
  * update title and remove unused files

### Commits

  * [[`4b602d037`](http://github.com/eggjs/egg/commit/4b602d037554b72c8261b7abb7efd94f8f59f3fe)] - fix: make singleton work for unextensible or frozen instance (#2472) (Yiyu He <<dead_horse@qq.com>>)
  * [[`824200c11`](http://github.com/eggjs/egg/commit/824200c11cac8e20b2c275daa7f5a4a365c71259)] - feat: add time duration for dump config (#2485) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`73dac083d`](http://github.com/eggjs/egg/commit/73dac083d2a029f893e9b6737080c921027e308f)] - docs: update wxapp-socket-io project to weapp.socket.io (#2421) (liuguili <<gongzili456@gmail.com>>)
  * [[`1ada8e384`](http://github.com/eggjs/egg/commit/1ada8e3848be9f09680d7cac091fb14206df5a11)] - feat(d.ts): add middleware to Application and other ts improvement (#2465) (Axes <<whxaxes@qq.com>>)
  * [[`437785315`](http://github.com/eggjs/egg/commit/437785315f28a828ea0cf7bece80223d5b796dc5)] - docs: fix the code error of LOCALS in view.md (#2464) (zjz19901029 <<346663801@qq.com>>)
  * [[`f341b9fb8`](http://github.com/eggjs/egg/commit/f341b9fb8bdf36b6280500578e8448c59aec10f1)] - chore: update title and remove unused files (#2433) (TZ |
天猪 <<atian25@qq.com>>)
  * [[`a5ab29cbd`](http://github.com/eggjs/egg/commit/a5ab29cbd1de0f5425019085258a496b4bce8b45)] - docs: switch to English document (#2426) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`4ab7df25f`](http://github.com/eggjs/egg/commit/4ab7df25f152609d494745eac2794b78e66444f0)] - deps: update dependencies, add @types/urllib to autod config (#2423) (Yiyu He <<dead_horse@qq.com>>)

## 2018-04-17, Version 2.7.1 @dead-horse

### Notable changes

* **fix**
  * imporve compatibility of singleton

### Commits

  * [[`e4d219f`](http://github.com/eggjs/egg/commit/e4d219f1aaecbca13601c7813e57c67934e8c32b)] - fix: imporve compatibility of singleton (#2410) (Yiyu He <<dead_horse@qq.com>>)

## 2018-04-16, Version 2.7.0 @dead-horse [DEPRECATED]

### Notable changes

* **feature**
  * singleton support asynchronous create function

* **fix**
  * dump config support circular json

* **docs**
  * improve router and typescript

### Commits

  * [[`3d499a9`](http://github.com/eggjs/egg/commit/3d499a90bab7095569e115e223de40e63812f2f5)] - docs(plugin): add singleton support async create function (#2392) (Yiyu He <<dead_horse@qq.com>>)
  * [[`05d925f`](http://github.com/eggjs/egg/commit/05d925fea4e0b2d8efa48cb01ced2133c0c059cd)] - docs: change English document on Readme (#2397) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`590bd8c`](http://github.com/eggjs/egg/commit/590bd8cb400845706ec7cc84232b812cb468c8ac)] - fix: dumpConfig support circular json (#2394) (Yiyu He <<dead_horse@qq.com>>)
  * [[`3a489b6`](http://github.com/eggjs/egg/commit/3a489b6f47b39ff2ec31efe936504918300b3f08)] - feat(singleton): support async create function (#2382) (Yiyu He <<dead_horse@qq.com>>)
  * [[`a5b6731`](http://github.com/eggjs/egg/commit/a5b673133b35e9b005e19c1e3267a2ff3d58e32b)] - docs: chore for router and typescript (#2390) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`ee2d2b3`](http://github.com/eggjs/egg/commit/ee2d2b3c33671a822b45a6c474d3710aab5e70d5)] - docs(passport): translation for passport tutorial (#2235) (Cemre Mengu <<cemremengu@gmail.com>>)
  * [[`6fad4e1`](http://github.com/eggjs/egg/commit/6fad4e1bed3c388e964fc656244e5e606b258085)] - chore: update package.json for release (#2381) (TZ | 天猪 <<atian25@qq.com>>)

## 2018-04-12, Version 2.6.1 @atian25

### Notable changes

* **docs**
  * TypeScript Guide (#2324)
  * fix d.ts with ts support
  * docs improve

### Commits

  * [[`2998bf733`](http://github.com/eggjs/egg/commit/2998bf733268d4d88d5fc77e05943b3fa0f824d4)] - chore(typings): add index signature of EggAppConfig (#2359) (waiting <<waiting@xiaozhong.biz>>)
  * [[`5f2358bbd`](http://github.com/eggjs/egg/commit/5f2358bbdd6e21a1ab387a8425d0fefc30954227)] - docs: intro session.renew in the doc (#2375) (Yiyu He <<dead_horse@qq.com>>)
  * [[`f0e7773f2`](http://github.com/eggjs/egg/commit/f0e7773f28eb7a233230a847ff2f8bc737aa3c01)] - docs: add TypeScript Guide (#2324) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`cd418f57a`](http://github.com/eggjs/egg/commit/cd418f57a843b504dcac6d8c25b99026e1edf072)] - docs(controller): add ctx.redirect (#2373) (Yiyu He <<dead_horse@qq.com>>)
  * [[`2fafb16b8`](http://github.com/eggjs/egg/commit/2fafb16b8810e41b86d15f51257c2a0531c78357)] - docs(socketio): update demo & solve problem on chrome (#2354) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`ba708ca4e`](http://github.com/eggjs/egg/commit/ba708ca4e911a345d2ee6aea5d4cf5845f93212b)] - feat: support customized client error (#2283) (Khaidi Chu <<i@2333.moe>>)
  * [[`8697140d6`](http://github.com/eggjs/egg/commit/8697140d6ab10f42980ea301e7122331b6e5573a)] - chore: add export to declarations (#2344) (Axes <<whxaxes@qq.com>>)
  * [[`441884145`](http://github.com/eggjs/egg/commit/4418841452a20a4fcca212e17dad0fbe9ff97646)] - chore(typings): export PowerPartial (#2327) (waiting <<waiting@xiaozhong.biz>>)
  * [[`33d39519e`](http://github.com/eggjs/egg/commit/33d39519e1bd9bb1451776abe4986cdf4dee7626)] - docs(passport): config passport-github behind of proxy (#2318) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`84e0dc4e7`](http://github.com/eggjs/egg/commit/84e0dc4e74e4e907d39b5485e1b19c3900aec393)] - fix(d.ts): add modifier to plugin and add middleware to config (#2322) (Axes <<whxaxes@qq.com>>)

## 2018-04-04, Version 2.6.0 @atian25

### Notable changes

* **feature**
  * TypeScript tool support (#2272)

* **docs**
  * improve d.ts with ts support (#2306)
  * docs improve and translation

### Commits

  * [[`406142758`](http://github.com/eggjs/egg/commit/40614275845f49512e80d1c8c00d1997ee91b113)] - chore: improve d.ts with ts support (#2306) (Axes <<whxaxes@qq.com>>)
  * [[`7fba689b7`](http://github.com/eggjs/egg/commit/7fba689b73fa46fdf7447844338a7f538ad78665)] - docs(controller): session example bug (#2313) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`e0e7ed146`](http://github.com/eggjs/egg/commit/e0e7ed146adfe932558628b815caa2d8c64d6939)] - chore(typings): change export interface to class definition (#2293) (waiting <<waiting@xiaozhong.biz>>)
  * [[`161107929`](http://github.com/eggjs/egg/commit/1611079291ddcf8cc82dba40a2406dcad20b75b5)] - docs(plugin): add config notice for `addSingleton`  function (#2305) (Shangbin Yang <<rccoder.net@gmail.com>>)
  * [[`1c74a8491`](http://github.com/eggjs/egg/commit/1c74a84918869ec035c5767884501a87cce945d5)] - docs: add assets document (#2220) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`e4531e563`](http://github.com/eggjs/egg/commit/e4531e563214472e54b4c467e0d2879e6390cb52)] - docs: EN translation for view plugin dev doc (#2240) (Cemre Mengu <<cemremengu@gmail.com>>)
  * [[`348ff18d8`](http://github.com/eggjs/egg/commit/348ff18d82e357d9bceba5136c339ef7dfb44bda)] - docs: EN translation for style guide doc (#2239) (Cemre Mengu <<cemremengu@gmail.com>>)
  * [[`d9c4ec2bb`](http://github.com/eggjs/egg/commit/d9c4ec2bbb3aa29ddcba2efceec6edfa879267d7)] - EN translation for resources doc (#2238) (Cemre Mengu <<cemremengu@gmail.com>>)
  * [[`46217a5d2`](http://github.com/eggjs/egg/commit/46217a5d2e451433ec86614cfb65336300a074d9)] - docs(security): add ssrf in security (#2274) (Yiyu He <<dead_horse@qq.com>>)
  * [[`c3586eab5`](http://github.com/eggjs/egg/commit/c3586eab535ee540ffac664f0311c656ef7adca2)] - docs: deprecate ignoreJSON (#2270) (Yiyu He <<dead_horse@qq.com>>)
  * [[`a86334c59`](http://github.com/eggjs/egg/commit/a86334c595530c5f4e9cf65204a4591dfd26bcf0)] - docs: example for custom id when mysql update (#2165) (OnedayLiu <<onedayliu552@gmail.com>>)
  * [[`10327e185`](http://github.com/eggjs/egg/commit/10327e185015098c9c29747abbaf79a352f975d7)] - docs: EN translation for socketio tutorial doc (#2167) (Cemre Mengu <<cemremengu@gmail.com>>)
  * [[`5b059db6a`](http://github.com/eggjs/egg/commit/5b059db6a879abb3ffe7b30e95855afc8a660107)] - docs: add boilerplate type desc (#2250) (QiChang Li <<github@liqichang.com>>)
  * [[`9007b5847`](http://github.com/eggjs/egg/commit/9007b5847e67b678f6624da4610b6bdff9457c52)] - chore: update package.json for release (#2244) (Haoliang Gao <<sakura9515@gmail.com>>)

## 2018-03-20, Version 2.5.0 @atian25

### Notable changes

* **feature**
  * display router when log app (#2230)
  * update `favicon.png`
  * upgrade cluster-client to 2.x (#2236)

* **docs**
  * improve d.ts
  * add socket.io webchat description (#2198)

### Commits

  * [[`6040d6f8f`](http://github.com/eggjs/egg/commit/6040d6f8f1a67282ff697c6d86945bc0cb487fe6)] - chore: fix spelling error rotator (#2242) (HE ZIQIANG <<heziqiang@qq.com>>)
  * [[`1554da57e`](http://github.com/eggjs/egg/commit/1554da57ef9d8b0fd2cb023a0cc68b50bee6b69f)] - chore: upgrade cluster-client to 2.x (#2236) (zōng yǔ <<gxcsoccer@users.noreply.github.com>>)
  * [[`9faa052bf`](http://github.com/eggjs/egg/commit/9faa052bfdffe887c1557126a73a62fe2e462dc5)] - feat: tsd add init module (#2233) (Eward Song <<eward.song@gmail.com>>)
  * [[`d5f9059f1`](http://github.com/eggjs/egg/commit/d5f9059f1935a67748033143081755811664df9d)] - docs: translation for basic plugin (#2166) (Cemre Mengu <<cemremengu@gmail.com>>)
  * [[`7afc7e24b`](http://github.com/eggjs/egg/commit/7afc7e24b60776a71702ae5495d637b1ac4a3d06)] - feat: display router when log app (#2230) (Kiho · Cham <<monkindey@163.com>>)
  * [[`5e99fd6fd`](http://github.com/eggjs/egg/commit/5e99fd6fd86be4de5a2eca24bc2025f120cef6aa)] - docs: egg-passsport-local -> egg-passport-local (楊傑文 Chuck Yang <<chuck@ninethreads.com>>)
  * [[`c042366df`](http://github.com/eggjs/egg/commit/c042366df6a691e56c528f16083516a53e114944)] - docs(socket.io): add webchat description (#2198) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`5cce8795a`](http://github.com/eggjs/egg/commit/5cce8795a733c9096de6e050fec5a87be99b0002)] - chore: fix typo. (#2172) (薛定谔的猫 <<hh_2013@foxmail.com>>)

## 2018-03-05, Version 2.4.1 @dead-horse

### Notable changes

* **fix**
  * [security] don't allow x-forwarded-host header by default
  * `ctx.runInBackground` will try to use custom function name first

* **docs**
  * improve d.ts
    * add regexp as type of path in Router
    * fix type of `render`
  * more semantic and moment installation in quickstart

### Commits

  * [[`0eabce6`](http://github.com/eggjs/egg/commit/0eabce6389190cecc00011512ec7e4e63fd0471e)] - fix: don't allow x-forwarded-host header (#2163) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`f0edf96`](http://github.com/eggjs/egg/commit/f0edf9622b6a18831f285e6ceb5a0e2b25b04fd0)] - fix: try to use custom function name first (#2161) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`1a73720`](http://github.com/eggjs/egg/commit/1a73720d8ba14c612cc6fd38d419212e032049f8)] - fix(typings): add regexp as type of path (#2157) (AngrySean <<xujihui1985@gmail.com>>)
  * [[`b55e908`](http://github.com/eggjs/egg/commit/b55e908643dc2ef1a21c7a4b11559e1785985792)] - doc(quickstart): more semantic and moment installation (#2154) (Kiho · Cham <<monkindey@163.com>>)
  * [[`951e236`](http://github.com/eggjs/egg/commit/951e236586f3fdc988504f4138351b2c7778e67c)] - Fix type of `render` (#2155) (Arniu Tseng <<arniu2006@gmail.com>>)

## 2018-02-28, Version 2.4.0, @fengmk2

### Notable changes

* **feature**
  * support Keep-Alive Header

* **fix**
  * add logger in base_context_class

* **docs**
  * Lots of d.ts improved.
    * add context
    * add urllib
    * add resources & logger
  * new documents
    * how to call the service
    * socket.io tutorial
    * add events on application

### Commits

  * [[`79927324a`](http://github.com/eggjs/egg/commit/79927324a5aeb1f826fc9f133bed253d8324c62e)] - fix: add logger in base_context_class (#2149) (Axes <<whxaxes@qq.com>>)
  * [[`a73900231`](http://github.com/eggjs/egg/commit/a7390023150ff4d5a7ec069276a94542a7ef67fa)] - feat: support Keep-Alive Header (#2146) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`c8284367c`](http://github.com/eggjs/egg/commit/c8284367c727aa2da453a1a485c4d7f97cfb3967)] - docs(ts): fix some d.ts (#2144) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`e0282b923`](http://github.com/eggjs/egg/commit/e0282b923375132fcc3b936b471999a84eb1e941)] - docs(router): add definition of ctx (#2136) (重庆 <<1756260160@qq.com>>)
  * [[`3e7ef6aa5`](http://github.com/eggjs/egg/commit/3e7ef6aa566d800411822d9a4195c9df34634789)] - docs(app-start): how to call service (#2133) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`9472b5828`](http://github.com/eggjs/egg/commit/9472b5828c95cd1dec2910b657d1e6c34372a6a2)] - docs(schedule): fix log dir (#2123) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`ede433fc5`](http://github.com/eggjs/egg/commit/ede433fc594c915683a519bf9b409209812806cf)] - docs(unittest):fix some mistakes (#2110) (恬竹 <<2632807692@qq.com>>)
  * [[`2d03c79a1`](http://github.com/eggjs/egg/commit/2d03c79a1842846c4caf2f3b971a5bae5fc9f24d)] - chore: add urllib declaration support in index.d.ts (#2117) (SoraYama <<sorayamahou@gmail.com>>)
  * [[`fd6fa2495`](http://github.com/eggjs/egg/commit/fd6fa24955a7a7bceaad7b2f754123282b7e1cbe)] - docs(2.x-advanced-plugin):fix some descriptions (#2111) (恬竹 <<2632807692@qq.com>>)
  * [[`0a208d741`](http://github.com/eggjs/egg/commit/0a208d7413d77f12048df91b6bdb6e2dfd047c89)] - docs: translation for advanced/plugin.md (#2075) (DukeFightLife <<AdoBeatTheWorld@users.noreply.github.com>>)
  * [[`42e4ea4c1`](http://github.com/eggjs/egg/commit/42e4ea4c12a542671bac7ca92931e83d0fc439f4)] - docs(schedule):fix some places (#2105) (恬竹 <<2632807692@qq.com>>)
  * [[`63278c229`](http://github.com/eggjs/egg/commit/63278c2293b0899165386288c38cac44aa7a0b71)] - docs(2.x-basic-extend):fix some mistakes (#2107) (恬竹 <<2632807692@qq.com>>)
  * [[`7a604d37f`](http://github.com/eggjs/egg/commit/7a604d37f5184c268263779fa2b8ca459e3d6f5b)] - docs(2.x-basic-service):fix some mistakes of service (#2102) (恬竹 <<2632807692@qq.com>>)
  * [[`a1a4e7dd3`](http://github.com/eggjs/egg/commit/a1a4e7dd32bf040b69e8c8bfbdcae3e483eee335)] - docs(plugin): add description for plugin.local.js (#2104) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`2cdfcc249`](http://github.com/eggjs/egg/commit/2cdfcc249863630dbb298374dbbe2b45864a0e1c)] - docs(development): adjust to new version vscode (#2098) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`bb4b29002`](http://github.com/eggjs/egg/commit/bb4b290027a6dcf8404ae357e29aaa6a76d5413a)] - docs(faq): add the most common mistake of config (#2086) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`5621a8574`](http://github.com/eggjs/egg/commit/5621a8574b60d61dab79f601105b69710559831c)] - docs(schedule): logging && args (#2091) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`03a894439`](http://github.com/eggjs/egg/commit/03a89443904211785ca600ec74f78d75bbf7a299)] - docs: d.ts of resources& logger (#2079) (x22x22 <<wadeking@qq.com>>)
  * [[`bbfacc5a7`](http://github.com/eggjs/egg/commit/bbfacc5a75984a7ddc111195b51d7da8bd6d0713)] - docs(middleware): use app.middleware instead of app.middlewares (#2077) (x22x22 <<wadeking@qq.com>>)
  * [[`7e9f330ee`](http://github.com/eggjs/egg/commit/7e9f330eea2efcc26e99eb89ad3fb40c517e0101)] - docs(socket.io): add tutorial (#1913) (Suyi <<thonatos@users.noreply.github.com>>)
  * [[`1224dd65f`](http://github.com/eggjs/egg/commit/1224dd65f2e4dadcce70d9a6e8e66122d93fbdd7)] - docs(2.x-basic-controller):fix some descriptions of basic-controller (#2043) (恬竹 <<2632807692@qq.com>>)
  * [[`fa5bdaeb5`](http://github.com/eggjs/egg/commit/fa5bdaeb5fec6385f81bc4c3781036df3fa6d870)] - style(app/extend/request.js): Some Comments from Chinese To English in union (#2051) (DongWei <<maledong_forwork@foxmail.com>>)
  * [[`06e7710c7`](http://github.com/eggjs/egg/commit/06e7710c73c5f4ad313d08b770e5874919e21b88)] - docs: add events on application (#2039) (Yiyu He <<dead_horse@qq.com>>)
  * [[`65e038132`](http://github.com/eggjs/egg/commit/65e038132c9183c66c11fb50e3a8bc6358cdae4c)] - docs(advanced/loader): translate (#1654) (Weilun Xiong <<azardf4yy@gmail.com>>)

## 2018-01-26, Version 2.3.0, @dead-horse

### Notable changes

* **feature**
  * emit `request` and `response` event in every request

* **docs**
  * improve english docs
  * add alinode usage

### Commits

  * [[`50a0f8a`](http://github.com/eggjs/egg/commit/50a0f8ac8fe246d664f73f171b8886f9b9c2eda7)] - doc: fix deploy example (dead-horse <<dead_horse@qq.com>>)
  * [[`3b7a313`](http://github.com/eggjs/egg/commit/3b7a313965f9c8ae6e20a16dd74533b1885f216f)] - docs(deploy): more about alinode (#2036) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`950b9e6`](http://github.com/eggjs/egg/commit/950b9e684f2441674ed85a3c0152002991d2ff86)] - doc: fix deploy docs (dead-horse <<dead_horse@qq.com>>)
  * [[`18d6436`](http://github.com/eggjs/egg/commit/18d6436195ca1a73098c643d39ce4560b20e7d76)] - docs: translate advanced/cluster-client.md (#1839) (学究 <<zsxyz1314@gmail.com>>)
  * [[`287c761`](http://github.com/eggjs/egg/commit/287c7615ad425b130e2c669a41409bfa763feef2)] - Update deployment.md (#1979) (juju <<juju_chen@foxmail.com>>)
  * [[`22dfaa7`](http://github.com/eggjs/egg/commit/22dfaa72e3851196153f4ecb7f3599d2951e9b1b)] - feat: emit request and response event (#2020) (Yiyu He <<dead_horse@qq.com>>)
  * [[`ddbb4b3`](http://github.com/eggjs/egg/commit/ddbb4b3c0ec7cfc5c9b1baa7e678770613bd4761)] - docs(deploy): add alinode (#2025) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`b5d823f`](http://github.com/eggjs/egg/commit/b5d823f52a770f879da46c6968adadd3fa14e8d7)] - docs(core/unittest): fix path of helper.js(#2029) (#2030) (Jiulong Hu <<me@hujiulong.com>>)
  * [[`1e3a4b3`](http://github.com/eggjs/egg/commit/1e3a4b35801e136dd4f1fbaf3c49b771a50c0f72)] - docs(basic-router):fix some places of basic-router (#2012) (恬竹 <<2632807692@qq.com>>)

## 2018-01-22, Version 2.2.1, @dead-horse

### Notable changes

* **fix**
  * log cookie's key when cookie exceed limit length

* **document**
  * improve english documents, fix some grammars
  * add link to alicloud node.js perfomance platform
  * use PATCH method in resource router

### Commits

  * [[`aa46eb2`](http://github.com/eggjs/egg/commit/aa46eb26d45012036c69c524db512ed16fde7b6b)] - fix: log cookie's key when cookie exceed limit length (#1996) (Yiyu He <<dead_horse@qq.com>>)
  * [[`7993b45`](http://github.com/eggjs/egg/commit/7993b45ec2af8c2d96d82370d877476786504dc8)] - docs(basic-middleware):fix some descriptions of basic-middleware (#1998) (恬竹 <<2632807692@qq.com>>)
  * [[`b2d09e1`](http://github.com/eggjs/egg/commit/b2d09e150da70a08c1886b00031c0f07eeb7d830)] - docs: put => patch. (#1793) (#1938) (吴建金 <<mosaic101@foxmail.com>>)
  * [[`dede240`](http://github.com/eggjs/egg/commit/dede240340570c00e3baed8098853a44c902dc21)] - feat: add helper interface in d.ts (#1989) (Axes <<whxaxes@qq.com>>)
  * [[`19fe608`](http://github.com/eggjs/egg/commit/19fe6085fedabfc09eb9c26534df237decf4d28e)] - docs: add deer stat (#1974) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`cef371e`](http://github.com/eggjs/egg/commit/cef371e4a176c62d9b44c0f1e55668e992921d2d)] - docs(basic-env): fix some descriptions base on the Chinese version (#1930) (恬竹 <<2632807692@qq.com>>)
  * [[`55d08bd`](http://github.com/eggjs/egg/commit/55d08bded812b81efeee96a0e3465728c7f4f5a2)] - fix(ts): error declare of route.resource (#1959) (AntSworD <<zhengjj.asd@gmail.com>>)
  * [[`32d7c81`](http://github.com/eggjs/egg/commit/32d7c8199611b00cd5117e6adcf8904ea0b33ff5)] - docs: fix word error (#1965) (jxDeveloper <<896222652@qq.com>>)
  * [[`3acf45f`](http://github.com/eggjs/egg/commit/3acf45f77ef791b1e6467bd4047511d867d46cc9)] - docs(basic-config): fix some word spelling (#1931) (恬竹 <<2632807692@qq.com>>)
  * [[`0e90819`](http://github.com/eggjs/egg/commit/0e9081954a765228ee9d590f01f3bfaaf1a4e5d8)] - docs(advanced/framework): translation (#1668) (freebyron <<freexiegd@gmail.com>>)
  * [[`ab1b08e`](http://github.com/eggjs/egg/commit/ab1b08ef520ab8db4cddd8f6cf52f1aa87d6975f)] - docs: fix en index (#1915) (Weilun Xiong <<azardf4yy@gmail.com>>)
  * [[`2270f7f`](http://github.com/eggjs/egg/commit/2270f7f0417f9c78958c6b51e70ad7a0d838d6ec)] - docs(basic-objects): fix some descriptions (#1903) (恬竹 <<2632807692@qq.com>>)
  * [[`c136470`](http://github.com/eggjs/egg/commit/c136470861b35a5f796d4edcdd8f6fbce41f7314)] - test: use Buffer.alloc, Buffer.from. (#1895) (薛定谔的猫 <<hh_2013@foxmail.com>>)
  * [[`73bc636`](http://github.com/eggjs/egg/commit/73bc636ddb82bd73fa14fb5f56e8ffe6260b46cc)] - docs(links): Add link to alicloud node.js perfomance platform (#1894) (Jackson Tian <<shyvo1987@gmail.com>>)
  * [[`55d1b0e`](http://github.com/eggjs/egg/commit/55d1b0eb5c4ca27668559b94259f0670b60d57b6)] - docs(deploy): add --ignore-stderr (#1876) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`532110a`](http://github.com/eggjs/egg/commit/532110abbc01cf3f225c47ed6219d9434c48808c)] - fix: fix 404 page url (#1881) (sam <<289623783@qq.com>>)

## 2017-12-26, Version 2.2.0, @dead-horse

### Notable changes

* **feature**
  * `config.meta.logging` to enable log every request when received

* **document**
  * fix some grammars
  * add rule for issue

### Commits

* [[`9fe5b85`](http://github.com/eggjs/egg/commit/9fe5b8563958d313b02482e5b3fe69c342acfa71)] - feat: enable request started log on meta middleware (#1877) (fengmk2 <<fengmk2@gmail.com>>)
* [[`8ce9611`](http://github.com/eggjs/egg/commit/8ce9611e2e2e5098a7a4557e0f8d29cd93ab468c)] - docs(objects): fix some grammars (#1806) (恬竹 <<2632807692@qq.com>>)
* [[`e43aa2b`](http://github.com/eggjs/egg/commit/e43aa2bad227475744ef6422f376475d0ee266c4)] - docs(error-handling): fix some words (#1874) (Fan <<incomparable9527@foxmail.com>>)
* [[`4c1617a`](http://github.com/eggjs/egg/commit/4c1617a16ee3df1b455f5eeb1cb31e37e5f593c1)] - docs(faq): add rule for issue (#1861) (TZ | 天猪 <<atian25@qq.com>>)

## 2017-12-15, Version 2.1.0, @dead-horse

### Notable changes

* **feature**
  * add 400 response for broken client request to instead of empty response
  * dump application router json

* **fix**
  * fix: run dumpConfig at the last ready callback

* **document**
  * migrate docs to egg 2
  * add document for passport

### Commits

* [[`40df153`](http://github.com/eggjs/egg/commit/40df153dd7ca8124a7502ba6cdc838835388a0ae)] - feat: add 400 response for broken client request to instead of empty response (#1829) (Khaidi Chu <<i@2333.moe>>)
* [[`d0ee9f2`](http://github.com/eggjs/egg/commit/d0ee9f2500e69a1e0662c9ea597bf97db3418041)] - docs(passport): fix some description (#1828) (TZ | 天猪 <<atian25@qq.com>>)
* [[`f7c6a0a`](http://github.com/eggjs/egg/commit/f7c6a0a835ea950e98e40a0b4b83736912b5ab82)] - docs(passport): add description (#1825) (TZ | 天猪 <<atian25@qq.com>>)
* [[`f66d9be`](http://github.com/eggjs/egg/commit/f66d9be57807c04058511b47611afa890884b2a5)] - docs(passport): the missing docs for passport (#1824) (TZ | 天猪 <<atian25@qq.com>>)
* [[`18f93f0`](http://github.com/eggjs/egg/commit/18f93f0b927a08e6bd356f9fcc6a3141e813e85f)] - docs(core/view.md): translation (#1577) (Zhongyuan <<zhang.zhongyuan11@gmail.com>>)
* [[`7e05669`](http://github.com/eggjs/egg/commit/7e056692506f5801390fd804d75bf6756991a54b)] - 1. docs(error-handle): missing function keywords. (#1819) (M.Y.Akashi <<yanzhi.mo@aliyun.com>>)
* [[`89e114c`](http://github.com/eggjs/egg/commit/89e114cb88ef1ef96e479001bf0f8250867111c9)] - docs: add AntV links (#1809) (TZ | 天猪 <<atian25@qq.com>>)
* [[`bdfd3cc`](http://github.com/eggjs/egg/commit/bdfd3cc62b8377cadac2a6c108944d86eaca3df0)] - docs(router): new style & remove app.verb (#1803) (TZ | 天猪 <<atian25@qq.com>>)
* [[`4c9eacb`](http://github.com/eggjs/egg/commit/4c9eacbb7d4560924602103e5e23ae578ac34a52)] - docs(middleware): add description of import koa middleware (#1805) (TZ | 天猪 <<atian25@qq.com>>)
* [[`c152dee`](http://github.com/eggjs/egg/commit/c152deec69c3dbb06ce87433a46bab0bc61e295b)] - docs(loader): adjust extends way (#1729) (TZ | 天猪 <<atian25@qq.com>>)
* [[`289f8cd`](http://github.com/eggjs/egg/commit/289f8cd3d90cc24c55fa51e3d75f5750233af7ee)] - docs(progressive):changes some grammar (#1773) (恬竹 <<2632807692@qq.com>>)
* [[`ae87460`](http://github.com/eggjs/egg/commit/ae87460d6aacb38f4d60d703450f8085c72d3b0d)] - docs(migration): add description for plugin breakchange (#1766) (TZ | 天猪 <<atian25@qq.com>>)
* [[`a2788a8`](http://github.com/eggjs/egg/commit/a2788a870175d6c1abdad3c379bbb9adc6c24ba9)] - docs(controller): import base controller directly (#1771) (Yiyu He <<dead_horse@qq.com>>)
* [[`7ebfc9b`](http://github.com/eggjs/egg/commit/7ebfc9b96b03a6b1bdffc3da65c6940902dc3086)] - docs(quickstart): fix typo in code example (#1765) (Darren Poon <<dyhpoon@gmail.com>>)
* [[`6ff6998`](http://github.com/eggjs/egg/commit/6ff699824dce6962d7aa9e9e48f41a50a994834f)] - docs: add security english translation (#1691) (Adams <<jtyjty99999@126.com>>)
* [[`a061f21`](http://github.com/eggjs/egg/commit/a061f21178b2253b587dab780ba74f19605109a4)] - docs(intro): make some changes for egg-and-koa (#1739) (恬竹 <<2632807692@qq.com>>)
* [[`d752b3b`](http://github.com/eggjs/egg/commit/d752b3b795cc0c5a579770695fcadd3db713ff6f)] - docs(deployment): adjust with new version egg-scripts (#1757) (TZ | 天猪 <<atian25@qq.com>>)
* [[`1b12b51`](http://github.com/eggjs/egg/commit/1b12b519937e80728d133ea24ff88a2568b72a57)] - docs(cookie-session): use async (#1723) (TZ | 天猪 <<atian25@qq.com>>)
* [[`5c88026`](http://github.com/eggjs/egg/commit/5c880266f9968a2e9b102db7c0eea2c7b0f09a43)] - docs(plugin): use async (#1730) (TZ | 天猪 <<atian25@qq.com>>)
* [[`ebb8adf`](http://github.com/eggjs/egg/commit/ebb8adfadcf21ba29997c65d5adc5a92235ffa8d)] - some changes of docs(what is egg) (#1734) (恬竹 <<2632807692@qq.com>>)
* [[`2da00fc`](http://github.com/eggjs/egg/commit/2da00fca45d9bc161cae5ab9754a3fcc0321b9c7)] - docs(framework): use new way (#1728) (TZ | 天猪 <<atian25@qq.com>>)
* [[`47fbee5`](http://github.com/eggjs/egg/commit/47fbee574b94d9f6420d44e7a8f0ccec035d94f4)] - docs(cluster-client): use async (#1727) (TZ | 天猪 <<atian25@qq.com>>)
* [[`1420682`](http://github.com/eggjs/egg/commit/1420682dc5b6fb14342373d9b70614c3de0c015b)] - docs(ipc): use async (#1722) (TZ | 天猪 <<atian25@qq.com>>)
* [[`503b69b`](http://github.com/eggjs/egg/commit/503b69b2e5c3f59b9c3c307a50e711cd8eb8d967)] - feat: dump application router json (fengmk2 <<fengmk2@gmail.com>>)
* [[`76ff783`](http://github.com/eggjs/egg/commit/76ff783b80a9d9ffc01db1b434c25fedd6e27ca7)] - fix: run dumpConfig at the last ready callback (fengmk2 <<fengmk2@gmail.com>>)
* [[`50efe4c`](http://github.com/eggjs/egg/commit/50efe4ceb9a4c8ec902a503db7ad10ffe7819e1a)] - docs(httpclient): use async (#1724) (TZ | 天猪 <<atian25@qq.com>>)
* [[`d043148`](http://github.com/eggjs/egg/commit/d043148b8ee69614098b39604dd6b7d7e1a84810)] - docs: remove async-function (#1713) (TZ | 天猪 <<atian25@qq.com>>)
* [[`e3ef3ec`](http://github.com/eggjs/egg/commit/e3ef3ec65c5e2874c813f6cda18b61b630d137be)] - docs(restful): use async (#1709) (TZ | 天猪 <<atian25@qq.com>>)
* [[`b042937`](http://github.com/eggjs/egg/commit/b042937b1e77b8206206a248c9f3e3ab82b7d6d8)] - docs(error-handling): use async (#1721) (TZ | 天猪 <<atian25@qq.com>>)
* [[`80ab243`](http://github.com/eggjs/egg/commit/80ab2439d508e9e0574df31061b5bb14988c2e3e)] - docs(i18n): use async (#1720) (TZ | 天猪 <<atian25@qq.com>>)
* [[`6741999`](http://github.com/eggjs/egg/commit/67419996a3abd403ab8d67755ecb98c3a9b97338)] - docs(logger): use async (#1719) (TZ | 天猪 <<atian25@qq.com>>)
* [[`f39c105`](http://github.com/eggjs/egg/commit/f39c105067e08fe416f86d0a415f5475ce66ba17)] - docs(view): use async (#1717) (TZ | 天猪 <<atian25@qq.com>>)
* [[`cf3de0f`](http://github.com/eggjs/egg/commit/cf3de0f248e3435a7d6ac41ece16dea55f5e86c9)] - docs(unittest): use async (#1716) (TZ | 天猪 <<atian25@qq.com>>)
* [[`cb9c9a4`](http://github.com/eggjs/egg/commit/cb9c9a43015a47347273bf8a09d971205b0d57ec)] - docs(mysql): use async (#1711) (TZ | 天猪 <<atian25@qq.com>>)

## 2017-11-20, Version 2.0.0, @dead-horse

### Notable changes

* **performance**
  * By removing the wrapper code of `co` library, performance increase over 30% (which not include the performance boost coming with Node 8), see [#14](https://github.com/eggjs/benchmark/pull/14) and [benchmark](https://eggjs.github.io/benchmark/plot/)

* **feature**
  * [BREAKING CHANGE] drop node <8 support
  * upgrade to egg-core@4(base on koa 2), but still supports all the usages in egg 1
  * upgrade built-in plugins to adapt egg@2
  * `runInBackground` use location as scope name when anonymous

* **fix**
  * dump async function as AsyncFunction

* **document**
  * migrate some documents to async function
  * split plugin and plugin development
  * refactor the description about cluster client @vincenthou
  * add document for how to customize error handler
  * translate cookie and session @zhang-z
  * translate basics/schedule.md, thanks @Azard

### Commits

  * [[`8197826`](http://github.com/eggjs/egg/commit/8197826a8dca062c91ba45c235cec66a93f335a4)] - docs: refine egg-and-koa with egg 2 (#1686) (Yiyu He <<dead_horse@qq.com>>)
  * [[`757f275`](http://github.com/eggjs/egg/commit/757f275a16741c670f210876408aaeefe5797a23)] - fix: dump async function as AsyncFunction (#1687) (Yiyu He <<dead_horse@qq.com>>)
  * [[`12edd64`](http://github.com/eggjs/egg/commit/12edd64915164df6b2d5fed9e179e90954f25687)] - test: use async function instead of generator function (#1684) (Yiyu He <<dead_horse@qq.com>>)
  * [[`5513456`](http://github.com/eggjs/egg/commit/5513456e2c702fdc1b7a500f8d8d58048d1041fa)] - feat: runInBackground use location as scope name when anonymous (#1683) (Yiyu He <<dead_horse@qq.com>>)
  * [[`212b077`](http://github.com/eggjs/egg/commit/212b077993cff01c08c55fa4545c324adb96322c)] - doc: Add th.yml (#1682) (NatPi <<31546528+NatJNP@users.noreply.github.com>>)
  * [[`3ddd67f`](http://github.com/eggjs/egg/commit/3ddd67fbbb83a783541118a05d7e0febb2fde7f3)] - docs(advanced/cluster-client): refactor the description about cluster client (#1417) (vincent.hou <<vincenthou365@gmail.com>>)
  * [[`3d948e4`](http://github.com/eggjs/egg/commit/3d948e44e55fbb88c318a8f14fa7a0b0a8b71b4e)] - docs(plugin): split plugin and plugin development (#1663) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`b1343ad`](http://github.com/eggjs/egg/commit/b1343ad55f08b15f8084104c54db0b5975716323)] - docs(core/unittest): translate unittest.md (#1660) (freebyron <<freexiegd@gmail.com>>)
  * [[`fb2d96a`](http://github.com/eggjs/egg/commit/fb2d96ae8e1759edc9126a2920f9028b6e4d15df)] - docs(app-start): generator -> async (#1662) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`12c0a8a`](http://github.com/eggjs/egg/commit/12c0a8afb8cd332037670f7db8e8662566c1407f)] - docs(quickstart): fix app.Service (#1661) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`49b0071`](http://github.com/eggjs/egg/commit/49b00712de6eed7c386b07c7c91082ef36cc667f)] - docs(core/cookie-and-session): translate section Cookie (#1562) (Zhongyuan <<zhang.zhongyuan11@gmail.com>>)
  * [[`ac55d5e`](http://github.com/eggjs/egg/commit/ac55d5eb0b90e2333e3d92523075615e80835647)] - docs: fix typo in async function (#1657) (BccSafe <<bccsafe5988@gmail.com>>)
  * [[`9f362d8`](http://github.com/eggjs/egg/commit/9f362d878b61e1144ceab851215dbafb974fb85f)] - docs(basics/schedule.md): translate (#1648) (Weilun Xiong <<azardf4yy@gmail.com>>)
  * [[`448d094`](http://github.com/eggjs/egg/commit/448d0945c0030d2f2bdf8e0f85ccfcbde4ba2b25)] - deps: upgrade all plugins to adapt egg@2 (#1653) (Yiyu He <<dead_horse@qq.com>>)
  * [[`4993ee8`](http://github.com/eggjs/egg/commit/4993ee8fae81bf14f92c86ac1d4d952d62e1d165)] - docs(quickstart): generator -> async (#1650) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`8c6f16d`](http://github.com/eggjs/egg/commit/8c6f16d64834d46b0689ce079cc5d71155848ac8)] - docs: how to customize error handler (#1651) (Yiyu He <<dead_horse@qq.com>>)
  * [[`8e8869a`](http://github.com/eggjs/egg/commit/8e8869a4d73908503cf1f60de3be49461639ca08)] - refactor: upgrade egg-core@4 (#1631) (Yiyu He <<dead_horse@qq.com>>)

## 2017-11-08, Version 1.11.0, @dead-horse

### Notable changes

* **feature**
  * export global namespace at d.ts @atian25

### Commits

  * [[`b131a4c`](http://github.com/eggjs/egg/commit/b131a4cec51cc783dcd4ccb8756439063c5b875c)] - feat: export global namespace at d.ts (#1633) (TZ | 天猪 <<atian25@qq.com>>)

## 2017-11-08, Version 1.10.1, @dead-horse

### Notable changes

* **fix**
  * use `app.options` instead of deprecated `app._options`
* **document**
  * translate core/cluster-and-ipc.md, thanks @lslxdx

### Commits

  * [[`9eec677`](http://github.com/eggjs/egg/commit/9eec677757ddbde6f7ddcff2c6a698087e07b70e)] - fix: use `app.options` instead of `app._options` (#1625) (Yiyu He <<dead_horse@qq.com>>)
  * [[`fd1ff63`](http://github.com/eggjs/egg/commit/fd1ff638920fef4a3258767df982b87e70614215)] - test: fix tsc test case (#1620) (Yiyu He <<dead_horse@qq.com>>)
  * [[`6804bd3`](http://github.com/eggjs/egg/commit/6804bd36cfc7a9bd54b3be2d9ce828d4e951f8b8)] - test: add node 9 and drop node 7 (#1602) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`3878862`](http://github.com/eggjs/egg/commit/38788621ccf06fd6ac8f4068de3e49c5668e1915)] - docs: translate core/cluster-and-ipc.md (#1594) (lslxdx <<lslxdx@163.com>>)

## 2017-10-24, Version 1.10.0, @popomore

### Notable changes

* **feature**
  * add Subscription @popomore
* **document**
  * multipart example @dead_horse
  * fix document @atian25 @beilunyang
  * improve schedule document @atian25

### Commits

  * [[`6dd1594a5`](http://github.com/eggjs/egg/commit/6dd1594a5c300f24e668b3679c7ae8df733b6a39)] - docs: fix egg-scripts (#1552) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`46ed6fac9`](http://github.com/eggjs/egg/commit/46ed6fac9f94d300a23903a71cfafdb5c8b1ba91)] - feat: add Subscription (#1469) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`c508f9fa7`](http://github.com/eggjs/egg/commit/c508f9fa7dedbc8c3c4f6319b7233a034db463b4)] - docs: fix csrf (#1551) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`7fb9bbf71`](http://github.com/eggjs/egg/commit/7fb9bbf71219debf35b4e864a65be22e24a0480a)] - docs: fix typo (#1537) (悖论 <<786220806@qq.com>>)
  * [[`68c0e1a9c`](http://github.com/eggjs/egg/commit/68c0e1a9c053618133d3484043abfb77e3372a22)] - docs: adjust new schedule (#1477) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`aeae948ec`](http://github.com/eggjs/egg/commit/aeae948ec986f5f7204ad6a0f748403b8e6e6fe1)] - docs: adjust middleware config at framework (#1523) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`7b37d2393`](http://github.com/eggjs/egg/commit/7b37d2393f59f3c5efbc84cf1d5f51e9332b0cd8)] - docs: multipart example use yield parts() (#1518) (Yiyu He <<dead_horse@qq.com>>)
  * [[`6846badc8`](http://github.com/eggjs/egg/commit/6846badc8da89b00483aa7be5c69b1cd2f06d797)] - docs: add plugin.js description (#1499) (TZ | 天猪 <<atian25@qq.com>>)

## 2017-09-25, Version 1.9.0, @gxcsoccer

### Notable changes

* **feature**
  * make cluster client configurable in egg
  * don’t force logger to use INFO level in prod
* **document**
  * correct sample codes, by @Jawnkuin
  * fix devtools debug, by @atian25
  * adjust debug docs with new egg-bin debug, by @atian25
  * fix port should be number, @atian25

### Commits

  * [[`21425e7`](https://github.com/eggjs/egg/commit/21425e7a9c451cfa07f3cb580d0b770eb5b0c890)] - feat: make cluster client configurable in egg (#1459) (gxcsoccer <<gxcsoccer@126.com>>)
  * [[`d0797b1`](https://github.com/eggjs/egg/commit/d0797b1c2d078d1bea97c104471388bedc5e61c9)] - docs: correct sample codes (#1434) (Jawnkuin <<jawnkuin@gmail.com>>)
  * [[`6eac07e`](https://github.com/eggjs/egg/commit/6eac07eb287ecf158b2c182a0e36a81fa14700ce)] - refactor: httpclient args tracer to be enforced (#1421) (hui <<kangpangpang@gmail.com>>)
  * [[`c56274b`](https://github.com/eggjs/egg/commit/c56274bb818526370f857b926d178ff520b3bea8)] - docs(development): fix devtools debug (#1428) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`e3f29de`](https://github.com/eggjs/egg/commit/e3f29de9bbbfb67c641cf54272883759d7256d89)] - docs(development): adjust debug docs with new egg-bin debug (#1427) (AnzerWall <<AnzerWall@gmail.com>>)
  * [[`5a9531a`](https://github.com/eggjs/egg/commit/5a9531abbec83fbff08ddb6feb475f87498d2a3d)] - feat: don’t force logger to use INFO level in prod (#1218) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`95fbd47`](https://github.com/eggjs/egg/commit/95fbd47f4c20797df17dd210f30a40f43d1d8900)] - docs(deployment): port should be number (#1424) (TZ | 天猪 <<atian25@qq.com>>)

## 2017-09-11, Version 1.8.0, @leoner

### Notable changes

* **feature**
  * support app.httpclient and agent.httpclient auto set tracer
* **fix**
  * should extends from egg-core BaseContextClass
* **document**
  * English documents `basics/objects`,`core/docs-logger` and `core/httpclient`
    have been translated by @DarrenWong, @Azard and @gztchan
  * documents typo fixed and improved by @vincenthou, @waitingsong and @hyj1991

### Commits

  * [[`54be7dc09`](http://github.com/eggjs/egg/commit/54be7dc099f47fb65b9bc3d9bb29de4d70ac25cd)] - docs(core/cluster-and-ipc): fix some typo (#1415) (vincent.hou <<vincenthou365@gmail.com>>)
  * [[`6cf17c11a`](http://github.com/eggjs/egg/commit/6cf17c11af51220904881ed99aa65cac0f212c2b)] - docs: (core/httpclient): [translate] Done  (#1409) (Darren Wong <<darrenwongf@gmail.com>>)
  * [[`105e1947e`](http://github.com/eggjs/egg/commit/105e1947ee0863ebd6c0a1111f218b025e0e9989)] - docs: translate basics/objects (#1238) (Weilun Xiong <<azardf4yy@gmail.com>>)
  * [[`f7c0d8520`](http://github.com/eggjs/egg/commit/f7c0d85209c9e96f7812c4a2996f000a2667770d)] - feat: support app.httpclient and agent.httpclient auto set tracer (#1393) (hui <<kangpangpang@gmail.com>>)
  * [[`3aaee8fbe`](http://github.com/eggjs/egg/commit/3aaee8fbea4aee8b5c40921670642772835bf40d)] - fix: should extends from egg-core BaseContextClass (#1392) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`a9936a383`](http://github.com/eggjs/egg/commit/a9936a383174fd0b2c201ee759bc5174486970a1)] - fix: typo (#1388) (waiting <<waiting@xiaozhong.biz>>)
  * [[`eef30faf6`](http://github.com/eggjs/egg/commit/eef30faf69b41f4a352a592ad65d097698d27303)] - docs: adjust webstorm debug config (#1367) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`499454379`](http://github.com/eggjs/egg/commit/499454379b2234a80d3946933f7511ac83c292d6)] - docs: curl(url, opts) add parameter introduction (#1351) (#1352) (hyj1991 <<66cfat66@gmail.com>>)
  * [[`4daf497eb`](http://github.com/eggjs/egg/commit/4daf497eb32c05c73911a01e861b9cf761ede451)] - docs(en/core/docs-logger): finish logger.md translation in English (#1254) (Tony Chan <<gztchan@gmail.com>>)
  * [[`aaacd56c9`](http://github.com/eggjs/egg/commit/aaacd56c9c60dbf0cbfd0d1fcc77366a3e3993fe)] - docs: remove egg-scripts env default description (#1318) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`4feae70b8`](http://github.com/eggjs/egg/commit/4feae70b8c8e69890053bff9f3df9cc7024d69cd)] - docs: add egg-scripts to deployment (#1279) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`08ed1b3c6`](http://github.com/eggjs/egg/commit/08ed1b3c68e242eba187640c9f6cf8a0acd7489f)] - docs(unittest): typo of egg-mock (#1284) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`734854c84`](http://github.com/eggjs/egg/commit/734854c84ef8b0107df3101b6aa212d96574b317)] - docs(unittest): add bootstrap usage (#1278) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`ebbbcd574`](http://github.com/eggjs/egg/commit/ebbbcd574f5bbd4d91bec345e8b35f9adc48d6c0)] - chore: skip docs deploy at ci cron (#1268) (TZ | 天猪 <<atian25@qq.com>>)

## 2017-07-27, Version 1.7.0, @popomore

### Notable changes

* **feature**
  * Support listen options in config.js
* **improve**
  * `app.HttpClient` can be overwritten
* **document**
  * Document improvement
  * English documents have been translated by @gztchan

### Commits

  * [[`dd07cacb2`](http://github.com/eggjs/egg/commit/dd07cacb209565cc8bdc240b2a3bd7f624a3e56c)] - docs: fix typo on CONTRIBUTING.zh-CN.md (#1266) (SuperEwe <<superewe@qq.com>>)
  * [[`773343061`](http://github.com/eggjs/egg/commit/7733430614d62392fa1b06568e223ce2ae5b3709)] - docs: only deploy docs at 8 (#1252) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`4f2ebfda8`](http://github.com/eggjs/egg/commit/4f2ebfda81c067ba500ee22ac30c8b201f746cac)] - docs: fix const define (#1249) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`45bea3cb5`](http://github.com/eggjs/egg/commit/45bea3cb55636a09160bfc66befca476994dacc8)] - docs(core-deployment): translate deployment.md in English (#1235) (Tony Chan <<gztchan@gmail.com>>)
  * [[`dda386e42`](http://github.com/eggjs/egg/commit/dda386e425ce96019f3d068e66603f80af966571)] - test: add test and doc for listen options (#1246) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`3ef1de952`](http://github.com/eggjs/egg/commit/3ef1de95247aa3e3fdcbda71fe83e58a892a13d6)] - feat: set cluster options, include path, port, hostname (#1231) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`e9f93cf83`](http://github.com/eggjs/egg/commit/e9f93cf83d46fd84c8c6b10ec2e7e3eb2bf24f9d)] - refactor: export app.HttpClient that can be overwritten (#1234) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`96b3786eb`](http://github.com/eggjs/egg/commit/96b3786eb9640c9ec2d71a5a0a0b18ee32e9e3ad)] - docs(core/error-handling): translate error-handling.md in English (#1228) (Tony Chan <<gztchan@gmail.com>>)
  * [[`c3c9fce55`](http://github.com/eggjs/egg/commit/c3c9fce557a8d8c57b2a5e5391d1c11a81ceeaa7)] - docs(controller): examples use controller class (#1221) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`24f279005`](http://github.com/eggjs/egg/commit/24f2790051c0d248f6df9850ffe8513dc11e5780)] - docs: new VScode 1.14 default protocol changed. (#1212) (Anto <<anto17@foxmail.com>>)
  * [[`2b78b4cf8`](http://github.com/eggjs/egg/commit/2b78b4cf8275171ddf788550745edc3aef948ca7)] - docs: Fix config name from egg-Plugin to eggPlugin in plugin's doc (#1215) (hansen <<hasseyoung@gmail.com>>)

## 2017-07-19, Version 1.6.1, @fengmk2

### Notable changes

* **fix**
  * make sure config.httpclient.httpAgent.timeout >= 30000, and distinguish
    options: request, httpAgent and httpsAgent on `config.httpclient`.

### Commits

  * [[`988b8c8`](http://github.com/eggjs/egg/commit/988b8c84d0f63ce0e83e00bd12cff65ebf4f2ff5)] - fix: make sure config.httpclient.httpAgent.timeout >= 30000 (#1165) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`894005c`](http://github.com/eggjs/egg/commit/894005c8e683e764ec234c915afce89b57343f98)] - docs: (core/i18n): [translate] Done (#1194) (Darren Wong <<darrenwongf@gmail.com>>)
  * [[`410633b`](http://github.com/eggjs/egg/commit/410633b3e47098abc30d83429895b543431929ec)] - chore: kill ssh-agent after deploy (#1204) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`05f4785`](http://github.com/eggjs/egg/commit/05f47858a6d74041a10539443a9ea2e195826bc4)] - chore: add travis_wait to avoid deploying document timeout (#1201) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`367e1d6`](http://github.com/eggjs/egg/commit/367e1d66ef3bdb49ee41758246cdaf49e04ea140)] - docs: fix typo (#1191) (BingqiChan <<bingqichen@live.cn>>)

## 2017-07-04, Version 1.6.0, @fengmk2

### Notable changes

* **feature**
  * tsd add ctx.logger and logger.error support Error object
  * ignore any key contains "secret" on dump config files
  * show who define the property of the config on `run/application_config_meta.json`
* **fix**
  * don't cache the intermediate locals for application

### Commits

  * [[`5dc56fa`](http://github.com/eggjs/egg/commit/5dc56fac043eab22187f9ae1dd7e73d2160fd7ae)] - feat: ignore any key contains "secret" (#1156) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`74c8a54`](http://github.com/eggjs/egg/commit/74c8a547cc90939253946a145655996b59373457)] - feat: dump `run/${type}_config_meta.json` (#1155) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`b80bb14`](http://github.com/eggjs/egg/commit/b80bb1405c1f47c5596ff4a2c9540af7447430ec)] - fix: don't cache the intermediate locals for application (#1146) (Jackson Tian <<shyvo1987@gmail.com>>)
  * [[`7c70beb`](http://github.com/eggjs/egg/commit/7c70beb26ecf2176cda7547f3163fec11aff450f)] - docs: change istanbul to nyc (#1150) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`c7a87a8`](http://github.com/eggjs/egg/commit/c7a87a8abade84769b34a1ef0ba50a3cc12dec49)] - docs: adjust objects docs (#1140) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`0052351`](http://github.com/eggjs/egg/commit/005235162dce4b0e87768a201c9a68c4291592d4)] - docs: improve plugin dependencies (#1061) (luicfer <<lucifer4he@gmail.com>>)
  * [[`4322212`](http://github.com/eggjs/egg/commit/43222127b922b486d8f523230fed82ba453ee8d8)] - docs: add missing class in objects.md (kaiye <<catgecn@gmail.com>>)
  * [[`daa8227`](http://github.com/eggjs/egg/commit/daa82278332d7617d6ebb3d07e8cdfd1e95cf644)] - feat(tsd): add ctx.logger and logger.error support Error object (#1108) (Eward Song <<eward.song@gmail.com>>)
  * [[`7c2e436`](http://github.com/eggjs/egg/commit/7c2e43626d93049b5f91f59773ef02c4b0f478b3)] - docs: improve feature describe (#1102) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`5ae7814`](http://github.com/eggjs/egg/commit/5ae7814632b1f92d534a496fe4f51c6737447aba)] - chore: comments in english (#1101) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`9099be9`](http://github.com/eggjs/egg/commit/9099be91afa806d0a8258441d11e1da2318777ef)] - docs: unify config in quickstart (#1094) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`c31bc15`](http://github.com/eggjs/egg/commit/c31bc15097c692d08596a277c69fbd44f9d3e2bf)] - test: wait logger to flush (#1090) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`82d2158`](http://github.com/eggjs/egg/commit/82d2158e4c399ead9567b67dc27d13d1ef2e104e)] - docs: add Enclose.IO to Links (#1089) (Minqi Pan <<pmq2001@gmail.com>>)

## 2017-06-21, Version 1.5.0, @fengmk2

### Notable changes

* **feature**
  * better TypeScript support, add `index.d.ts` file.
  * enable overrideMethod middleware by default.
* **document**
  * Documents improved.

### Commits

  * [[`1d02601`](http://github.com/eggjs/egg/commit/1d026019df76525d2d9117c260eb5d892388121c)] - tsd: add another properties of FileStream (#1080) (Rwing <<Rwing@rwing.cn>>)
  * [[`2b1644e`](http://github.com/eggjs/egg/commit/2b1644e6d56e6481ee97bce009c5f53b4dd18441)] - feat: add tsd (#1027) (Eward Song <<eward.song@gmail.com>>)
  * [[`a4ba2a2`](http://github.com/eggjs/egg/commit/a4ba2a2a1ef7de49e196c01447fd73ab22ed6d34)] - feat: enable overrideMethod middleware by default (#1069) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`bfb8df5`](http://github.com/eggjs/egg/commit/bfb8df58bcc7d7fe0fd6ff3453efcb54b715b4a0)] - docs: typo (#1060) (chenbin92 <<chen@mothin.com>>)
  * [[`64d1b00`](http://github.com/eggjs/egg/commit/64d1b0026648e1128f09efb6e6c2cc7f632bf608)] - docs: add chrome devtools debug information (#1050) (仙森 <<dapixp@gmail.com>>)
  * [[`4e510b2`](http://github.com/eggjs/egg/commit/4e510b22836096a47d562dbd5ca8affd28f94f9e)] - chore: use app.httpRequest() instead of supertest (#1041) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`78a13d5`](http://github.com/eggjs/egg/commit/78a13d52c3b6e8b40a0015b285cda33a059c0ee4)] - docs: add more description at quickstart (#1042) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`ef7c864`](http://github.com/eggjs/egg/commit/ef7c864fbddf7e70afbd93a16d5176787328400d)] - docs: add ant.design link (#1037) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`f1b510c`](http://github.com/eggjs/egg/commit/f1b510c34039259c5772021432ab71a7a62b89e8)] - feat: add config.logger.disableConsoleAfterReady (#1001) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`4890eda`](http://github.com/eggjs/egg/commit/4890eda31b9bc60ea4a1a7f36460ec1bf86dc134)] - docs: Uniform the standards that we should acquire this parsed parame… (#1038) (Ruanyq <<yiqiang0930@163.com>>)
  * [[`9d705e4`](http://github.com/eggjs/egg/commit/9d705e4687cdb98d327fbd9a1061604828218dfc)] - test: make sure app close (#1030) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`1d72e37`](http://github.com/eggjs/egg/commit/1d72e3799822e252934d6218a978c2bd21f378d3)] - docs: fix caseStyle link (#1033) (Desen Meng <<mds@xue.bi>>)
  * [[`9b50725`](http://github.com/eggjs/egg/commit/9b507250725ef3beda0ee51ac0c2bc2b007b2ecb)] - docs: (tutorials/index.md & async-function.md ): [translate] Done (#1028) (Darren Wong <<darrenwongf@gmail.com>>)
  * [[`3d04199`](http://github.com/eggjs/egg/commit/3d041992912d9aca1eb0edc6b226474022e08236)] - docs: typo (#1029) (Jerry Wu <<perzy_wu@163.com>>)
  * [[`13b7c19`](http://github.com/eggjs/egg/commit/13b7c19531d772a2b932ada28e186a0dbd0cf5f5)] - test: node 8 (#976) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`1b108a7`](http://github.com/eggjs/egg/commit/1b108a72a96d3d8241b332b8e728a9ec409efbb1)] - docs: remove api that is from egg-rest (#1022) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`057bc47`](http://github.com/eggjs/egg/commit/057bc47e4c5e3ec8faae0de3807f656fa4ef41d4)] - test: add doc test (#989) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`c6eb7b2`](http://github.com/eggjs/egg/commit/c6eb7b2f59f24fe0c6a787829d33cdf0cd4a2e77)] - doc: fix view config doc (#991) (当轩 <<code.falling@gmail.com>>)
  * [[`52865b4`](http://github.com/eggjs/egg/commit/52865b47c4d336833ef1151bae9f30867359ceb6)] - docs: devtool inspect at 8.x (#1018) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`8a120fd`](http://github.com/eggjs/egg/commit/8a120fde73df60e23f8c5559a3281acaf0a393e0)] - docs: remove max time limit at schdule (#995) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`9084c24`](http://github.com/eggjs/egg/commit/9084c24dd10fcbcd0d436ada9639b59f36dd2edf)] - docs: add plugin list (#988) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`20a5d91`](http://github.com/eggjs/egg/commit/20a5d9127f7454c899f7701f02b04eefa7c61fce)] - test: disable coverage for schedule (#987) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`3de963f`](http://github.com/eggjs/egg/commit/3de963f3881ef6fb9c5b6fa207730c6695853239)] - docs(basics/structure.md): [translate] (#970) (Weilun Xiong <<330815461@qq.com>>)
  * [[`2f232f3`](http://github.com/eggjs/egg/commit/2f232f30b0ba7e14ab07c43e34d363bac3906a43)] - docs: file must appear after other fiels when using getFileStream (#982) (Yiyu He <<dead-horse@users.noreply.github.com>>)

## 2017-05-28, Version 1.4.0, @dead-horse

### Notable changes

* **feature**
  * use lru to aovid oom when httpclient dns cache enabled
* **fix**
  * fix port is missed when httpclient dns cache enabled
  * fix request url object will be changed when httpclient dns cache enabled
  * set maxSockets defautl value to Number.MAX_SAFE_INTEGER
* **document**
  * Documents improved. Thanks @DarrenWong, @zousandian, @lslxdx, @Azard, @johnnychen, @coogleyao, @DanielWLam, @m31271n, @Brian175

### Commits

* [[`7370a62`](http://github.com/eggjs/egg/commit/7370a62e190db55dab3fde7f39f621f449301eaa)] - docs: translate tutorials/restful.md (#908) (Darren Wong <<darrenwongf@gmail.com>>)
* [[`5d8ca65`](http://github.com/eggjs/egg/commit/5d8ca654f311c52fd5faaa939943071c3f69f43f)] - docs: translatebasics/controller.md (#889) (lslxdx <<lslxdx@163.com>>)
* [[`5b959e0`](http://github.com/eggjs/egg/commit/5b959e0a382491b3111afb66e10b6e866105e0c8)] - docs: translate tutorials/progressive.md to English version (#966) (Darren Wong <<darrenwongf@gmail.com>>)
* [[`35fa5a9c`](http://github.com/eggjs/egg/commit/35fa5a9c4c2d969f66a5e4df28e1da7f69370709)] - fix: set maxSockets defautl value to Number.MAX_SAFE_INTEGER (#938) (tangyao <<2001-wms@163.com>>)
* [[`5b6fe2b`](http://github.com/eggjs/egg/commit/5b6fe2b187b2c1a4bcee4693b2b1043f2724fe68)] - feat: use lru to aovid oom in dns cache httpclient (#961) (Yiyu He <<dead-horse@users.noreply.github.com>>)
* [[`3c5c0b8`](http://github.com/eggjs/egg/commit/3c5c0b8d81bb63166f6592390d14277d3baca283)] - docs: Fix objects.md typo (#969) (三点 <<zousandian@gmail.com>>)
* [[`2bca50b`](http://github.com/eggjs/egg/commit/2bca50b2217424b8cdacd48550dcc39a31e50cff)] - docs(core/unittest.md): update with app.httpRequest() (#943) (Weilun Xiong <<330815461@qq.com>>)
* [[`713e033`](http://github.com/eggjs/egg/commit/713e033f90eb39aad8ac48916985396ca5282815)] - docs: app.controller.foo instead of 'foo' (#942) (Yiyu He <<dead-horse@users.noreply.github.com>>)
* [[`cfc76ec`](http://github.com/eggjs/egg/commit/cfc76ec721460780d703ead1dfdd315ed484e5c8)] - fix spell error from sign to signed (#932) (johnnychen <<johnnychq@gmail.com>>)
* [[`12499d6`](http://github.com/eggjs/egg/commit/12499d636dd471f35e54aad9f09b5f452ea198bf)] - docs: fix yield db.query for en (#930) (Yao Mengfei <<coogleyao@gmail.com>>)
* [[`25c7c95`](http://github.com/eggjs/egg/commit/25c7c95bff9eb51baf4f93724444982209872895)] - docs: translate basics/router.md (#896) (lslxdx <<lslxdx@163.com>>)
* [[`a5c7ac4`](http://github.com/eggjs/egg/commit/a5c7ac462a275c5393f93308a7f31b21cba524a2)] - docs: translate basics/service.md (lslxdx <<lslxdx@163.com>>)
* [[`7ee5de6`](http://github.com/eggjs/egg/commit/7ee5de6b0ad628332a5c130eb5a405b993a98c60)] - docs: translate basics/extend.md (#884) (DanielLam <<lwd931227@126.com>>)
* [[`9bf3a65`](http://github.com/eggjs/egg/commit/9bf3a6511469ee85963096836ae8c2421313448d)] - docs: Update env.md (#918) (m31271n <<m31271n@2players.studio>>)
* [[`b3825f3`](http://github.com/eggjs/egg/commit/b3825f33406c01ebc19b16519eccfca9f60e770f)] - docs: fix objects.md (#928) (Yiyu He <<dead-horse@users.noreply.github.com>>)
* [[`fd04ea2`](http://github.com/eggjs/egg/commit/fd04ea222af962e7fe9b82d108a0bd6f23b32891)] - docs: add document for built-in objects (#914) (Yiyu He <<dead-horse@users.noreply.github.com>>)
* [[`6180d5d`](http://github.com/eggjs/egg/commit/6180d5db90047a58222ba24d660c1a19b93648f3)] - docs: use names of constants declared (#923) (Yao Mengfei <<coogleyao@gmail.com>>)
* [[`02b02e0`](http://github.com/eggjs/egg/commit/02b02e0faf0d423105136723b9d2938a182fd486)] - docs: using a doctools as a external lib (#913) (Haoliang Gao <<sakura9515@gmail.com>>)
* [[`5113088`](http://github.com/eggjs/egg/commit/51130889ad8d75baa157c43d9b88e7d08c6067fe)] - fix(docs):  yield db.query (#921) (Yao Mengfei <<coogleyao@gmail.com>>)
* [[`ddd342c`](http://github.com/eggjs/egg/commit/ddd342c84358319aaffe9ee6eab90c2df1a2e9dc)] - docs: translate basic/config.md (#875) (Brian175 <<zhangweilu@buaa.edu.cn>>)
* [[`ae99e5d`](http://github.com/eggjs/egg/commit/ae99e5d6ee032171d17ce7ce67a8cb3c2f7bd04b)] - fix(docs): basics/structure.md link agent typo (#909) (Weilun Xiong <<330815461@qq.com>>)
* [[`fac3e0c`](http://github.com/eggjs/egg/commit/fac3e0c7306b1143698c29a3685c8116c36b1434)] - refactor: rename private method name to symbol (#904) (Yu Qi <<njuyuqi@gmail.com>>)
* [[`8115c57`](http://github.com/eggjs/egg/commit/8115c575ea082a92ebda5e4fd08ba4ad37e47bc0)] - docs: translate docs/source/zh-cn/tutorials/mysql.md  (#883) (Darren Wong <<darrenwongf@gmail.com>>)
* [[`e13c515`](http://github.com/eggjs/egg/commit/e13c515226566ae3c87c35b575a8e914e75c6a0b)] - Release 1.3.0 (#885) (fengmk2 <<fengmk2@gmail.com>>)

## 2017-05-11, Version 1.3.0, @fengmk2

### Notable changes

  * **document**
    * Documents improved. Thanks @Rwing, @lslxdx, @solarhell, @magicdawn
    * API document is out https://eggjs.org/api/
  * **refactor**
    * Set coreLogger's consoleLevel to WARN in local env

### Commits

  * [[`bd6681a`](http://github.com/eggjs/egg/commit/bd6681a509f74af7f39b1505962c0d75958ae0d3)] - chore: typo eggg=>egg (#881) (Rwing <<Rwing@rwing.cn>>)
  * [[`22c9cd9`](http://github.com/eggjs/egg/commit/22c9cd96df19bb43d1681ce0cffc59bc930c8f0f)] - docs: translated & proofread 'middleware.md' (#784) (lslxdx <<lslxdx@163.com>>)
  * [[`e55a134`](http://github.com/eggjs/egg/commit/e55a13439ec297081d33a7eb2f87ece605581908)] - docs: Add a link to issue template (#853) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`b01d30e`](http://github.com/eggjs/egg/commit/b01d30e33e9b910ee24d69d3b55e2dbe887ff4e3)] - docs: Fix typo. (#869) (jethro <<songjiaxin2008@gmail.com>>)
  * [[`b3403b5`](http://github.com/eggjs/egg/commit/b3403b56a5635394a4dc9825ef2780850449e573)] - docs: fix view typo (#867) (Tao <<magicdawn@qq.com>>)
  * [[`5d6e067`](http://github.com/eggjs/egg/commit/5d6e067fc36697b7c01f290bccac06ce21fb4371)] - chore: add quality badge (#857) (仙森 <<chaogui.hcg@alibaba-inc.com>>)
  * [[`8d6755b`](http://github.com/eggjs/egg/commit/8d6755b33c54d6230d1b20141dd6d043ed6c3897)] - deps: upgrade dependencies (#854) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`bd0a827`](http://github.com/eggjs/egg/commit/bd0a827c38f0a2cff42c8a73909081a1f9cd939a)] - refactor: set consoleLevel WARN of coreLogger in local (#850) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`af174ef`](http://github.com/eggjs/egg/commit/af174efb0a0dfe545849d03f8ec1fbee34559dae)] - docs: Add API document to menu (#845) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`edfc07e`](http://github.com/eggjs/egg/commit/edfc07e841b751a4c195544167f50a2ad56971e8)] - chore: generate puml (#842) (Haoliang Gao <<sakura9515@gmail.com>>)

## 2017-05-04, Version 1.2.1, @popomore

### Notable changes

  * **fix**
    * loadPlugin can be extended

### Commits

  * [[`13587667`](http://github.com/eggjs/egg/commit/13587667ac019ca516ae11aea728e84966dc57a5)] - fix(loader): loadPlugin can be extended (#836) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`1a027ad7`](http://github.com/eggjs/egg/commit/1a027ad727468d48afe45d1f3ce54de2e4ecfd16)] - test: use assert instead of should (#837) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`89b4df9d`](http://github.com/eggjs/egg/commit/89b4df9d21ddf07efd246145c52141a72e07ad80)] - docs: fix  wrong name in chinese router doc (#833) (Tomatoo <<424203705@qq.com>>)

## 2017-04-28, Version 1.2.0, @popomore

### Notable changes

  * **document**
    * Documents improved, Thanks @Rwing, @bingqichen, @okoala, @binsee, @lslxdx
  * **feature**
    * Move BaseContextClass to egg and add BaseContextLogger [#816](https://github.com/eggjs/egg/pull/816)
    * Remove logger config in local environment [#695](https://github.com/eggjs/egg/pull/695)

### Commits

  * [[`0757655c`](http://github.com/eggjs/egg/commit/0757655cfed451ab3b1ca5a480fb96a3da908708)] - feat: BaseContextClass add logger (#816) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`9871e450`](http://github.com/eggjs/egg/commit/9871e45098ab4927236382656c4ac774eeffcd11)] - docs: only use inspect at 7.x+ (#813) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`394bf371`](http://github.com/eggjs/egg/commit/394bf3711312f09d851be728b718e4d0f8fc9c1f)] - docs:Modify some words (#811) (binsee <<binsee@163.com>>)
  * [[`1132779c`](http://github.com/eggjs/egg/commit/1132779c4057bf96be1b73a3473b1545c3b5ab7a)] - docs(head.swig):fix the document page anchor position offset. (#790) (binsee <<binsee@163.com>>)
  * [[`9ef9d6aa`](http://github.com/eggjs/egg/commit/9ef9d6aa5953106555f11ac5dee6fe544773ceb8)] - fix(package.json & doc.js): fix doc tool error. (#791) (binsee <<binsee@163.com>>)
  * [[`90234efb`](http://github.com/eggjs/egg/commit/90234efbae13066ced3d25e8ba7201c0197c3ab1)] - docs(middleware.md): fix grammar (lslxdx <<lslxdx@163.com>>)
  * [[`9200a51d`](http://github.com/eggjs/egg/commit/9200a51d5b5c530a8f5ce8af4dd61f38981dc4c8)] - docs(basic/controller.md): typo 'matchs' -> 'matches' (#802) (lslxdx <<lslxdx@163.com>>)
  * [[`b4eb05b3`](http://github.com/eggjs/egg/commit/b4eb05b301bb1226edfc634ec90d1a5ae53514e2)] - docs(zh-cn docs):fix some link and link text in docs (#789) (binsee <<binsee@163.com>>)
  * [[`df1bf345`](http://github.com/eggjs/egg/commit/df1bf3459fd03f948532f7b6d2d436a74c54ed59)] - docs: add inspector protocol vscode debug (#776) (仙森 <<dapixp@gmail.com>>)
  * [[`a8893f7e`](http://github.com/eggjs/egg/commit/a8893f7e7d9937d675d8be0da7bed0f2c259ae39)] - docs: add vscode debug (#751) (#767) (仙森 <<dapixp@gmail.com>>)
  * [[`d4c345d3`](http://github.com/eggjs/egg/commit/d4c345d3d29266e0eb248eecee27bc0e492f5e5e)] - docs: typo fix "aync => async" (BingqiChen <<bingqichen@live.cn>>)
  * [[`492c97d6`](http://github.com/eggjs/egg/commit/492c97d61c75911ae0e987f65325a5c7493f63b9)] - docs: add vscode plugin link (#756) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`2bf23fef`](http://github.com/eggjs/egg/commit/2bf23feffb7b9ff1bc07d072a4052eec863d001c)] - docs: link plugins to github search results (#755) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`5befb0b1`](http://github.com/eggjs/egg/commit/5befb0b1f0f525ba778d54a5dedb72f2e880ab60)] - feat: remove egg logger local config (#695) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`1ab42e02`](http://github.com/eggjs/egg/commit/1ab42e0243354eab7f602faebd76d7117038e877)] - docs: document for middleware order (#724) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`d6be9499`](http://github.com/eggjs/egg/commit/d6be949973002880a2fe71313c7630f7f94fde97)] - chore: remove chinese commnets (#749) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`3bdbcae2`](http://github.com/eggjs/egg/commit/3bdbcae2486073447849f6e09831860dc42995d6)] - docs: fix typo, egg-bin => egg-init (#747) (Rwing <<Rwing@rwing.cn>>)

## 2017-04-11, Version 1.1.0, @fengmk2

### Notable changes

  * **document**
    * Lots of documents improve and typo fixes. Thanks @lslxdx, @zhennann, @dotnil, @no7dw, @cuyl, @Andiedie, @kylezhang,
      @SF-Zhou, @yandongxu, @jemmyzheng, @Carrotzpc, @zbinlin, @OneNewLife, @monkindey, @simman,
      @demohi, @xwang1024 and @davidnotes
  * **feature**
    * warn if some confused configurations exist in config [#637](https://github.com/eggjs/egg/pull/637)
    * use extend2 instead of extend to support `Array` config value [#674](https://github.com/eggjs/egg/pull/674)
    * expose context base classes on Application instance, make app or framework override context extend more easily [#737](https://github.com/eggjs/egg/pull/737)
    * expose egg.Controller and egg.Service [#741](https://github.com/eggjs/egg/pull/741)
  * **fix**
    * remove unused `jsonp` context delegate to response, please use [jsonp middleware instead](https://eggjs.org/zh-cn/basics/controller.html#jsonp) [#739](https://github.com/eggjs/egg/pull/739)

### Commits

  * [[`241b4e8`](http://github.com/eggjs/egg/commit/241b4e83c05e7086493564e536f5ce69d17dde0c)] - feat: expose egg.Controller and egg.Service (#741) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`26efa42`](http://github.com/eggjs/egg/commit/26efa427cf34e0ef0482d69fc10a77280e5fea5e)] - fix: remove unused jsonp delegate (#739) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`c33523d`](http://github.com/eggjs/egg/commit/c33523db3e086eafd1f7bc7486c6d1b2b68335e3)] - feat: export context base classes on Application (#737) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`ee127ad`](http://github.com/eggjs/egg/commit/ee127ad46b33a19d43c84a04649569a404a7f6af)] - docs: add sub directory support for controller (#734) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`88a1669`](http://github.com/eggjs/egg/commit/88a166933478373c4fd5cdd349d3b63e00cbaf7e)] - docs: typo at controller.md (#720) (lslxdx <<lslxdx@163.com>>)
  * [[`4c298c2`](http://github.com/eggjs/egg/commit/4c298c2c70017d12688e2801bfe6e66886ba24bd)] - docs: async-function typo, change generator to async (#712) (zhennann <<zhennann@qq.com>>)
  * [[`a9d27d0`](http://github.com/eggjs/egg/commit/a9d27d0ab3f3dea89487fc1e8c084b9ddc7e854d)] - docs: add schedule max interval (#711) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`9e94b7b`](http://github.com/eggjs/egg/commit/9e94b7b31106ce578a67dd15984d847587527299)] - docs: little grammar issues (#707) (Chen Yangjian <<jakeplus@gmail.com>>)
  * [[`a4d12ec`](http://github.com/eggjs/egg/commit/a4d12ecc6c468ebf37ff6acba06e65b15cfde4f4)] - chore: remove unused config (#694) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`88449f9`](http://github.com/eggjs/egg/commit/88449f9b292d69bd2f936f0ecb037efecbed2e8e)] - docs: add webstorm debug (#689) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`8517625`](http://github.com/eggjs/egg/commit/8517625b44f36909169032f8fff3ced3e1910a47)] - docs: correct spelling mistake (#682) (Wade Deng <<no7david@gmail.com>>)
  * [[`92ef92b`](http://github.com/eggjs/egg/commit/92ef92b7cec015d2843c9d7cb113694ad7ca34ec)] - docs: faq add where are my logs (#680) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`b8fc4e4`](http://github.com/eggjs/egg/commit/b8fc4e460e2dcffe60364a71dec2d07bd354d2cf)] - deps: use extend2 instead of extend (#674) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`0ccbcf9`](http://github.com/eggjs/egg/commit/0ccbcf98be8946891b520321743d3b5a95899955)] - docs: fix example code syntax error & typos (#672) (cuyl <<463060544@qq.com>>)
  * [[`1486705`](http://github.com/eggjs/egg/commit/14867059b5070b274cbee26df3accf5463eb4fe8)] - docs: security match and ignore (#668) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`7ab3791`](http://github.com/eggjs/egg/commit/7ab37915afc4a197cc58bc477e5b96cb1a73ced1)] - test: test for closing logger (#667) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`5f5cf91`](http://github.com/eggjs/egg/commit/5f5cf91a6af118ebc558252e07bcfa0f094045e3)] - docs(quickstart): tip for controller and config style (#666) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`e47c24b`](http://github.com/eggjs/egg/commit/e47c24b3f1fd27b0f545f107913d6c6e1cae53ac)] - docs: fix example code typos (#629) (SF-Zhou <<sfzhou.scut@gmail.com>>)
  * [[`7900576`](http://github.com/eggjs/egg/commit/7900576e690d038e4d75891890c467c743f03605)] - docs: fix egg-session-redis code (#642) (周长安 <<zchangan@163.com>>)
  * [[`8c77e59`](http://github.com/eggjs/egg/commit/8c77e5907834cb110a99a4ace0356868107c88e6)] - feat: warn if some confused configurations exist in config (#637) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`cd8c659`](http://github.com/eggjs/egg/commit/cd8c65965dc62fe7d45598450d6ef31ab344b878)] - docs: fix some typo (#638) (kyle <<succpeking@hotmail.com>>)
  * [[`7d830b7`](http://github.com/eggjs/egg/commit/7d830b7c92f81a9d133b7f1e6fe71b3d8a8d5a31)] - docs: fix reference framework path (#634) (kyle <<succpeking@hotmail.com>>)
  * [[`a471e93`](http://github.com/eggjs/egg/commit/a471e93977e67c98280af8517100bfe48495bbb2)] - docs: fix example code in basics/middleware (#624) (SF-Zhou <<sfzhou.scut@gmail.com>>)
  * [[`e87c170`](http://github.com/eggjs/egg/commit/e87c170770c117d275fd84c02a9fb1e699fa94cf)] - docs: fix code syntax (#628) (dongxu <<yandongxu@users.noreply.github.com>>)
  * [[`531dadd`](http://github.com/eggjs/egg/commit/531dadd7c3f8bd813c365d705ce7293a719e98f3)] - docs(security): Cookie of token, the key must be csrfToken (#625) (jemmy zheng <<jemmy.zheng@hotmail.com>>)
  * [[`8d73b02`](http://github.com/eggjs/egg/commit/8d73b02dcb856e3d8075aa34bc47a2f6dbb3af2b)] - docs: move cnzz to layout (#622) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`077bebe`](http://github.com/eggjs/egg/commit/077bebe17889d8a0cff2a1dbfebd72b4b8147ab3)] - docs: fix table render error in en env.md (#621) (SF-Zhou <<sfzhou.scut@gmail.com>>)
  * [[`990d45e`](http://github.com/eggjs/egg/commit/990d45e75f2d73b9bb4cddbf76e67452740e3178)] - docs: fixed table render error in env.md (#619) (SF-Zhou <<sfzhou.scut@gmail.com>>)
  * [[`e9428ba`](http://github.com/eggjs/egg/commit/e9428ba95fcd07ba255359a968dd027932ce2f77)] - docs: improve left padding when window between 1005 and 1130 (#617) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`c22e005`](http://github.com/eggjs/egg/commit/c22e0055ca8df35c1aa9d7d6ed7e31c21dd4b547)] - docs: turn off safe write in Jetbrains softwares (#614) (Shawn <<shaoshuai0102@gmail.com>>)
  * [[`2296b7b`](http://github.com/eggjs/egg/commit/2296b7b22cc3e240bb676444d4fd2f953338cea5)] - docs: fix document deploy (#609) (Haoliang Gao <<sakura9515@gmail.com>>)

## 2017-03-21, Version 1.0.0, @popomore

Release the first stable version :egg: :clap::clap::clap:

### Commits

  * [[`a3ad38d`](http://github.com/eggjs/egg/commit/a3ad38d649ff8eb0cd6dfcbe338466f1c59afef3)] - docs: fix HttpClient link in docs (#599) (Luobo Zhang <<zhang.pc3@gmail.com>>)
  * [[`242a4a1`](http://github.com/eggjs/egg/commit/242a4a1fbecfc4efa37cca58d1861040dd5838bd)] - docs: fix session's maxage (#598) (Yiyu He <<dead-horse@users.noreply.github.com>>)
  * [[`ee77e5c`](http://github.com/eggjs/egg/commit/ee77e5cdcb444f86bf9f50bfd89a63dd9321449f)] - docs: fix some typo (#597) (kyle <<succpeking@hotmail.com>>)
  * [[`984d732`](http://github.com/eggjs/egg/commit/984d7320881adf9420e5c7e49d62d5530ad887dd)] - refactor: app.cluster auto bind this (#570) (zōng yǔ <<gxcsoccer@users.noreply.github.com>>)
  * [[`4687f0f`](http://github.com/eggjs/egg/commit/4687f0f47566373938f9f928ac1dc4fa62590f4d)] - docs: fix session link (#595) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`3849c1c`](http://github.com/eggjs/egg/commit/3849c1c4b8f0354b12fd17bb884c33ef9e115e3c)] - docs: fix typo of httpclient & unittest (#591) (kyle <<succpeking@hotmail.com>>)
  * [[`871aa82`](http://github.com/eggjs/egg/commit/871aa82d28eeb026de6633cafbe168cca8ad3182)] - docs: add gitter & more controller ctx style (#585) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`a172960`](http://github.com/eggjs/egg/commit/a1729604959af84878dddb2776d621ee01c2d447)] - docs: typo (kyle <<succpeking@hotmail.com>>)
  * [[`54c10bc`](http://github.com/eggjs/egg/commit/54c10bc085b380f4f003d2f7987c205264dde1ad)] - docs: change controller showcase style to ctx (#568) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`d131f23`](http://github.com/eggjs/egg/commit/d131f236111981d7fb7021998bed200a46a4603d)] - docs: fix typo in docs (#563) (Jason Lee <<huacnlee@gmail.com>>)
  * [[`497b9a9`](http://github.com/eggjs/egg/commit/497b9a9e7c5cdcb0b769691ea40a74a4d284cfff)] - docs(faq): fix cluster link (#557) (Mars Wong <<marswong618@gmail.com>>)
  * [[`0d37e42`](http://github.com/eggjs/egg/commit/0d37e42259647ce9cb43deeba7a887817c7ef408)] - docs: update the style for search (#558) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`24ef44f`](http://github.com/eggjs/egg/commit/24ef44fa662392c7b80dbba8da0c4d5a7c9b83dd)] - docs: fix typo (#565) (Colin Cheng <<zbinlin@gmail.com>>)
  * [[`9eecf7b`](http://github.com/eggjs/egg/commit/9eecf7b0f928fc33d47e93782c79289ca2a13289)] - docs: rule for transforming filepath to properties (#547) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`d088283`](http://github.com/eggjs/egg/commit/d0882837c34a8b950a11e4f8fe4f47f29d8823f7)] - feat: show warning message with call stack (#549) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`4a89c3b`](http://github.com/eggjs/egg/commit/4a89c3b563ef79f5ad557ef741c16f283c11e835)] - docs: replace customEgg to framework (#545) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`c1464fb`](http://github.com/eggjs/egg/commit/c1464fbecb27caa0dc6766147d3b13d790466386)] - docs: more detail for mysql dynamic create (#540) (TZ | 天猪 <<atian25@qq.com>>)

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
