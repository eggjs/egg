# @eggjs/security

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/eggjs/security.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eggjs/security)

[npm-image]: https://img.shields.io/npm/v/@eggjs/security.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/security
[snyk-image]: https://snyk.io/test/npm/@eggjs/security/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/security
[download-image]: https://img.shields.io/npm/dm/@eggjs/security.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/security

egg 内置的安全插件

## 使用方式

egg 默认开启此插件，所以无需配置。

修改 `config/config.js` 文件修改配置

```js
exports.security = {
  xframe: {
    value: 'SAMEORIGIN',
  },
};
```

### 关闭安全防范

如果你想关闭其中一些安全防范，直接设置该项的 `enable` 属性为 false 即可，如关闭 xfame 防范：

```js
exports.security = {
  xframe: {
    enable: false,
  },
};
```

### match 和 ignore

如果只想开启针对某一路径，则配置 match 选项，例如只针对 `/example` 开启 csp

```js
exports.security = {
  csp: {
    match: '/example',
    // match: /^\/api/, // support regexp
    // match: ctx => ctx.path.startsWith('/api'), // support function
    // match: [ ctx => ctx.path.startsWith('/api'), /^\/foo$/, '/bar'], // support Array
    policy: {
      //...
    },
  },
};
```

如果需要针对某一路径忽略某安全选项，则配置 ignore 选项，例如针对 `/example` 关闭 xframe，以便合作商户能够嵌入我们的页面：

```js
exports.security = {
  xframe: {
    ignore: '/example',
    // ignore: /^\/api/, // support regexp
    // ignore: ctx => ctx.path.startsWith('/api'), // support function
    // ignore: [ ctx => ctx.path.startsWith('/api'), /^\/foo$/, '/bar'], // support Array
    // ...
  },
};
```

**注意：如果存在 match 则忽略 ignore。**

## API

### ctx.isSafeDomain(domain)

是否为安全域名。安全域名在配置中配置，见 `ctx.redirect` 部分

## 接口限制

### csrf

**使用**

- `ctx.csrf` 获取 csrf token

一般在 POST 表单时使用。

页面渲染时，将 `ctx.csrf` 作为 form 隐藏域或 query string 渲染在页面上。(`_csrf` 作为 key)

在提交表单时，带上 token 即可。

#### 通过 formData 上传时使用 csrf

浏览器端 html 代码:

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" /> file: <input name="file" type="file" />
  <button type="submit">上传</button>
</form>
```

### ctoken

ajax 防跨站攻击。

**使用**

在 ajax 请求时，以 `ctoken` 为 name 带上 ctoken 即可。

ctoken 从 cookie 中获取

**安全开发者约定**

- `ctx.ctoken` 获取 ctoken 的逻辑。使用者不要调用，安全插件内部使用。
- `ctx.setCTOKEN()` 设置 ctoken 的逻辑。使用者不要调用，安全插件内部使用。
- `ctx.assertCTOKEN()` ctoken 校验逻辑。使用者不要调用，安全插件内部使用。
- `ctx.setCTOKEN()`会将cookie设置到主域名下，主要考虑主域名下其他子域名对应的应用之间的互相调用。例如 A.xx.com 域种了 ctoken,会设置cookie到xx.com域上，在 B.xx.com 域的时候可以利用 ctoken 去请求，在 A 域 jsonp 请求 B 域的时候，B 域也可以验证 ctoken。

可拓展实现。例如 ctoken token 存在什么 cookie，存什么字段等，都可以通过以上两个接口拓展。

#### 配置项

```js
exports.security = {
  csrf: {
    type: 'ctoken', // 可以是 ctoken / referer / all, 默认为 ctoken
    useSession: false, // 如果设为 true，secret 将存储在 session 中
    ignoreJSON: false, // 如果设为 true ，将忽略 json 请求
    cookieName: 'csrfToken', // csrf 的 token 在 cookie 中存储的 key 名称
    sessionName: 'csrfToken', // csrf 的 token 在 session 中存储的 key 名称
    headerName: 'x-csrf-token', // csrf token 在 header 中的名称
    bodyName: '_csrf', // csrf token 在 body 中的名称
    queryName: '_csrf', // csrf token 在 query 中的名称
    rotateWhenInvalid: false, // csrf invalid 时刷新 token，用于同域名下多个业务 token 可能互相影响的情况
    refererWhiteList: [], // referer 白名单
    supportedRequests: [
      // 支持的 url path pattern 和方法，根据配置名单由上至下匹配 url path 正则，建议在自定义时配置 {path: /^\//, methods:['POST','PATCH','DELETE','PUT','CONNECT']} 为兜底规则
      { path: /^\//, methods: ['POST', 'PATCH', 'DELETE', 'PUT', 'CONNECT'] },
    ],
  },
};
```

注意，methods 可以为空， 如果将 supportedRequests 设置为`supportedRequests: [{path: /^\//, methods:[]}]`, 那么等效于关闭 csrf 防御。

### safe redirect

- `ctx.redirect(url)` 如果不在配置的白名单内，则禁止
- `ctx.unsafeRedirect(url)` 不建议使用

安全方案覆盖了默认的`ctx.redirect`方法，所有的跳转均会经过安全域名的判断。

用户如果使用`ctx.redirect`方法，需要在应用的配置文件中做如下配置：

```js
exports.security = {
  domainWhiteList: ['.domain.com'], // 安全白名单，以.开头
};
```

若用户没有配置 `domainWhiteList` 或者 `domainWhiteList` 数组内为空，则默认会对所有跳转请求放行，即等同于`ctx.unsafeRedirect(url)`。同时域名和 url 检查时不区分大小写。

### jsonp

使用 [jsonp-body](https://github.com/node-modules/jsonp-body)，在 egg context 中实现，并不再 egg-security 中。

防御内容：

- callback函数名词最长50个字符限制
- callback函数名只允许"[","]","a-zA-Z0123456789\_", "$" "."，防止一般的 xss，utf-7 xss等攻击

可定义配置：

- callback 默认 `_callback`，可以改名
- limit - 函数名 length 限制，默认 50

## helper

### .escape()

对字符串进行 xss 过滤，安全性最高的过滤方式。

```js
const str = '><script>alert("abc") </script><';
console.log(ctx.helper.escape(str));
// => &gt;&lt;script&gt;alert(&quot;abc&quot;) &lt;/script&gt;&lt;
```

在 nunjucks 模板中，默认进行 escape，不需要显式调用。

### .surl()

url 过滤。

用于在html标签中中要解析 url 的地方（比如 `<a href=""/><img src=""/>`），其他地方不允许使用。

对模板中要输出的变量，加 `helper.surl($value)`。

**特别需要注意的是在需要解析url的地方，surl 外面一定要加上双引号，否则就会导致XSS漏洞。**

不使用 surl

```html
<a href="$value" />
```

output:

```html
<a href="http://www.domain.com<script>" />
```

使用 surl

```html
<a href="helper.surl($value)" />
```

output:

```html
<a href="http://www.domain.com&lt;script&gt;" />
```

### .sjs()

用于在 js（包括 onload 等 event）中输出变量，会对变量中字符进行 JAVASCRIPT ENCODE，
将所有非白名单字符转义为 `\x` 形式，防止xss攻击，也确保在 js 中输出的正确性。

```js
const foo = '"hello"';

// 未使用 sjs
console.log(`var foo = "${foo}";`);
// => var foo = ""hello"";

// 使用 sjs
console.log(`var foo = "${this.helper.sjs(foo)}";`);
// => var foo = "\\x22hello\\x22";
```

### .shtml()

将富文本（包含 html 代码的文本）当成变量直接在模版里面输出时，需要用到 shtml 来处理。
使用 shtml 可以输出 html 的 tag，同时执行 xss 的过滤动作，过滤掉非法的脚本。

**由于是一个非常复杂的安全处理过程，对服务器处理性能一定影响，如果不是输出 HTML，请勿使用。**

简单示例：

```js
// js
const value = `<a href="http://www.domain.com">google</a><script>evilcode…</script>`;

// 模板
<html>
  <body>${helper.shtml($value)}</body>
</html>;
// => <a href="http://www.domain.com">google</a>&lt;script&gt;evilcode…&lt;/script&gt;
```

shtml 在 [xss](https://github.com/leizongmin/js-xss/) 模块基础上增加了针对域名的过滤。

- [默认规则](https://github.com/leizongmin/js-xss/blob/master/lib/default.js)
- 自定义过滤项 <http://jsxss.com/zh/options.html>

例如只支持 a 标签，且除了 title 其他属性都过滤掉：

```javascript
whiteList: {
  a: ['title'];
}
```

options:

> `config.helper.shtml.domainWhiteList` 已过时，请使用 `config.security.domainWhiteList` 代替。

注意，shtml 使用了严格的白名单机制，除了过滤掉 xss 风险的字符串外，
在 [默认规则](https://github.com/leizongmin/js-xss/blob/master/lib/default.js) 外的 tag 和 attr 都会被过滤掉。

例如 html 标签就不在白名单中，

```js
const html = '<html></html>';

// html
${helper.shtml($html)}

// 输出空
```

常见的 `data-xx` 属性由于不在白名单中，所以都会被过滤。

所以，一定要注意 shtml 的适用场景，一般是针对来自用户的富文本输入，切忌滥用，功能既受到限制，又会影响服务端性能。
此类场景一般是论坛、评论系统等，即便是论坛等如果不支持 html 内容输入，也不要使用此 helper，直接使用 escape 即可。

### .spath()

如果把输入字符串用作 path 路径，需要使用 spath 进行安全检验。若路径不合法，返回 null。

不合法的路径包括：

- 使用 `..` 的相对路径
- 使用 `/` 开头的绝对路径
- 以及以上试图通过 url encode 试图绕过校验的结果字符串

```js
const foo = '/usr/local/bin';
console.log(this.helper.spath(foo2));
// => null
```

### .sjson()

json转义

在js中输出json，若未做转义，易被利用为xss漏洞。提供此宏做json encode，会遍历json中的key，将value的值中，所有非白名单字符转义为\x形式，防止xss攻击。同时保持json结构不变。
若你有模板中输出一个json字符串给js应用的场景，请使用 `${this.helper.sjson(变量名)}`进行转义。

**处理过程较复杂，性能损耗较大，尽量避免使用**

实例:

```js
<script>window.locals = ${this.helper.sjson(locals)};</script>
```

### .cliFilter()

远程命令执行漏洞，用户通过浏览器提交执行命令，由于服务器端没有针对执行函数做过滤，导致可以执行命令，通常可导致入侵服务器。

如果用户可控变量为命令中的参数。则直接使用安全包函数过滤。

修复前：

```js
cp.exec('bash /home/admin/ali-knowledge-graph-backend/initrun.sh ' + port);
```

修复后：

```js
cp.exec('bash /home/admin/ali-knowledge-graph-backend/initrun.sh ' + this.helper.cliFilter(port));
```

如果因为业务需要，需要在参数中添加白名单之外的字符。可以将用户输入按照该字符分割，并使用过滤函数过滤每一段数据。

如果用户可控变量为命令中的命令，则和开发协商修改功能或功能下线。

### .escapeShellArg()

命令行参数转义。给字符串增加一对单引号并且能引用或者转码任何已经存在的单引号， 这样以确保能够直接将一个字符串传入 shell 函数，并且还是确保安全的。

```js
const ip = '127.0.0.1 && cat /etc/passwd';
const cmd = 'ping -c 1 ' + this.helper.escapeShellArg(ip);

console.log(cmd);
//ping -c 1 '127.0.0.1 && cat /etc/passwd'
```

### .escapeShellCmd()

命令行转义，从输入的命令行中删除下列字符: ``#&;`|*?~<>^()[]{}$;'", 0x0A 和 0xFF``

```js
const ip = '127.0.0.1 && cat /etc/passwd';
const cmd = 'ping -c 1 ' + this.helper.escapeShellCmd(ip);

console.log(cmd);
//ping -c 1 127.0.0.1  cat /etc/passwd
```

## Web 安全头

### hsts Strict-Transport-Security

默认开启，如果是 http 站点，需要关闭

- maxAge 默认一年 `365 * 24 * 3600`
- includeSubdomains 默认 false

### csp

默认关闭。需要开启的话，需要和安全工程师确定开启策略。

- policy 策略

### X-Download-Options:noopen

默认开启，禁用IE下下载框Open按钮，防止 ie 下下载文件默认被打开 xss

### X-Content-Type-Options:nosniff

禁用 IE8 自动嗅探 mime 功能。例如：`text/plain` 却当成 `text/html` 渲染，特别当本站点服务内容未必可信的时候。

### X-Frame-Options

默认 SAMEORIGIN，只允许同域把本页面当作 iframe 嵌入。

- value 默认值 `SAMEORIGIN`

### X-XSS-Protection

- close 默认值false，即设置为 `1; mode=block`

## 其他

- crossdomain.xml robots.txt 支持，默认都不加，系统可自行加，需要咨询项目安全工程师
- 禁止 trace track 两种类型请求

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
