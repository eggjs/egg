# History

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
