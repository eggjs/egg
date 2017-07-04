'use strict';

module.exports = app => {
  app.get('/app_same_ref', function*() {
    let app1, app2;
    this.app.locals = {
      a: 1
    };
    app1 = this.app.locals;
    this.app.locals = {
      b: 1
    };
    app2 = this.app.locals;
    this.body = app1 === app2;
  });

  app.get('/app_locals_oom', function*() {
    for (let i = 0; i < 1000; i++) {
      app.locals = {
        // 10MB
        buff: Buffer.alloc(10 * 1024 * 1024).toString()
      };
    }
    this.body = 'ok';
  });

  app.get('/ctx_same_ref', function*() {
    let ctx1, ctx2;
    this.locals = {
      a: 1
    };
    ctx1 = this.locals;
    this.locals = {
      b: 1
    };
    ctx2 = this.locals;
    this.body = ctx1 === ctx2;
  });

  app.get('/ctx_merge_app', function*() {
    this.app.locals = {
      a: 1
    };
    this.locals = {
      b: 1
    };
    this.body = {
      a: this.locals.a,
      b: this.locals.b,
    }
  });

  app.get('/ctx_override_app', function*() {
    this.app.locals = {
      a: 'app.a',
      b: 'app.b',
    };

    // this.locals set 的优先级高与 app.locals
    this.locals = {
      a: 'ctx.a'
    };

    // this.locals 的赋值，会覆盖 app.locals
    this.locals.b = 'ctx.b';

    const a = this.locals.a;
    const b = this.locals.b;

    this.body = {
      a,
      b,
    }
  });

  app.get('/ctx_app_update_can_not_affect_ctx', function*() {
    this.app.locals = {
      a: 'app.a',
      b: 'app.b',
    };
    // 访问一次
    let locals = this.locals;

    // 修改 app.locals 的成员取值
    this.app.locals.a = 'app.a.new';
    // 给 app 新增成员
    this.app.locals = {
      newProperty: 'new'
    };
    // 删除 app.locals 成员
    delete this.app.locals.b;

    this.body = {
      a: this.locals.a,
      b: this.locals.b,
      newPropertyExists: this.locals.hasOwnProperty('newProperty'),
    };
  });

  app.get('/set_only_support_object', function*() {
    let succeed = {};

    // 以 object 设置 app.locals
    this.app.locals = {
      'a': 'app.a'
    };
    succeed['app.locals.object'] = this.app.locals.a === 'app.a';

    // 以 object 设置 ctx.locals
    this.locals = {
      'b': 'ctx.b'
    };
    succeed['ctx.locals.object'] = this.locals.b === 'ctx.b';

    // 以常见非 object 类型设置 locals
    let targets = {
      'string': 'locals',
      'number': 1,
      'function': function () {
        return {
          'l' : 1,
        };
      },
      'array': ['a', 'b', 'c']
    };

    // 设置
    for (let type in targets) {
      this.app.locals = targets[type];
      succeed['app.locals.' + type] = this.app.locals === targets[type];

      this.locals = targets[type];
      succeed['ctx.locals.' + type] = this.locals === targets[type];
    }

    this.body = succeed;

  });
};
