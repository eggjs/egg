module.exports = app => {
  app.get('/safejson', async function () {
    const obj = {
      a: 1,
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{"a":1}"';
  });

  app.get('/unsafejson', async function () {
    const obj2 = {
      a: '<script type="sdfdsd">alert(111)</script>',
    };
    this.body =
      `${this.helper.sjson(obj2)}` ===
      '{"a":"\\\\x3cscript\\\\x20type\\\\x3d\\\\x22sdfdsd\\\\x22\\\\x3ealert\\\\x28111\\\\x29\\\\x3c\\\\x2fscript\\\\x3e"}';
  });

  app.get('/unsafejson2', async function () {
    const obj3 = {
      a: {
        b: {
          c: {
            d: '<script>?</script>',
          },
        },
      },
    };
    this.body =
      `${this.helper.sjson(obj3)}` ===
      '{"a":{"b":{"c":{"d":"\\\\x3cscript\\\\x3e\\\\x3f\\\\x3c\\\\x2fscript\\\\x3e"}}}}';
  });

  app.get('/unsafejson3', async function () {
    const obj4 = {
      a: {
        b: {
          c: {
            d: [
              '<script>?</script>',
              {
                e: '<script>',
              },
            ],
          },
        },
      },
    };
    this.body =
      `${this.helper.sjson(obj4)}` ===
      '{"a":{"b":{"c":{"d":["\\\\x3cscript\\\\x3e\\\\x3f\\\\x3c\\\\x2fscript\\\\x3e",{"e":"\\\\x3cscript\\\\x3e"}]}}}}';
  });

  app.get('/unsafejson4', async function () {
    const obj5 = {
      a: {
        b: {
          c: {
            '<script>': [
              '<script>?</script>',
              {
                e: '<script>',
              },
            ],
          },
        },
      },
    };
    this.body =
      `${this.helper.sjson(obj5)}` ===
      '{"a":{"b":{"c":{"\\\\x3cscript\\\\x3e":["\\\\x3cscript\\\\x3e\\\\x3f\\\\x3c\\\\x2fscript\\\\x3e",{"e":"\\\\x3cscript\\\\x3e"}]}}}}';
  });

  app.get('/unsafejson5', async function () {
    const obj6 = {
      '<script>': 1,
    };
    this.body = `${this.helper.sjson(obj6)}` === '{"\\\\x3cscript\\\\x3e":1}';
  });

  app.get('/safejsontc2', async function () {
    const obj = {
      a: [1],
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{"a":[1]}"';
  });

  app.get('/safejsontc3', async function () {
    const obj = {
      a: '1',
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{"a":"1"}"';
  });

  app.get('/safejsontc4', async function () {
    const obj = {
      a: {
        b: 2,
      },
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{"a":{"b":2}}"';
  });

  app.get('/safejsontc5', async function () {
    const obj = {
      a: Symbol(1),
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{}"';
  });

  app.get('/safejsontc6', async function () {
    const obj = {
      a: function () {
        alert(1);
      },
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{}"';
  });

  app.get('/safejsontc7', async function () {
    const obj = {
      a: new Buffer('222'),
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{"a":"222"}"';
  });

  app.get('/safejsontc8', async function () {
    const obj = {
      a: null,
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{"a":null}"';
  });

  app.get('/safejsontc9', async function () {
    const obj = {
      a: undefined,
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{}"';
  });

  app.get('/safejsontc10', async function () {
    const obj = {
      a: true,
    };
    this.body = `var foo = "${this.helper.sjson(obj)}"` === 'var foo = "{"a":true}"';
  });
};
