module.exports = app => {
  app.get('/sjs', async function () {
    const foo = '"hello"123abc"';
    this.body =
      `var foo = "${foo}"; var foo = "${this.helper.sjs(foo)}";` ===
      'var foo = ""hello"123abc""; var foo = "\\x22hello\\x22123abc\\x22";';
  });

  app.get('/sjs-2', async function () {
    let foo = '';
    let res = '';

    for (let i = 0, l = 128; i < l; i++) {
      if ((i > 47 && i < 58) || (i > 64 && i < 91) || (i > 96 && i < 123)) {
        foo += String.fromCharCode(i);
        res += String.fromCharCode(i);
      } else {
      }
    }

    this.body = `${this.helper.sjs(foo)}` === res;
  });

  app.get('/sjs-3', async function () {
    let foo = '';
    let res = '';

    for (let i = 0, l = 128; i < l; i++) {
      if (i == 9 || i == 10 || i == 13 || (i > 47 && i < 58) || (i > 64 && i < 91) || (i > 96 && i < 123)) {
      } else {
        foo += String.fromCharCode(i);
        res += '\\x' + i.toString(16);
      }
    }

    this.body = `${this.helper.sjs(foo)}` === res;
  });

  app.get('/sjs-4', async function () {
    const map = {
      '\t': '\\t',
      '\n': '\\n',
      '\r': '\\r',
    };
    let foo = '';
    let res = '';

    for (let i = 0, l = 128; i < l; i++) {
      if (i == 9 || i == 10 || i == 13) {
        foo += String.fromCharCode(i);
        res += map[String.fromCharCode(i)];
      }

      if (i == 9 || i == 10 || i == 13 || (i > 47 && i < 58) || (i > 64 && i < 91) || (i > 96 && i < 123)) {
      } else {
        foo += String.fromCharCode(i);
        res += '\\x' + i.toString(16);
      }
    }
    this.body = `${this.helper.sjs(foo)}` === res;
  });
};
