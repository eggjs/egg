cookie
=====

## API

* ctx.getCookie(name, opts)
* ctx.setCookie(name, val, opts)
* ctx.deleteCookie(name)

## cookie options

对于 cookie 的使用注意点：

* 对于前端需要可见的数据，有两种情况
  * 前端可以修改 signed: false, encrypt: false, httpOnly: false
  * 前端只能读，不允许写 signed: true, encrypt: false, httpOnly: false
* 对于只是后端用的数据，使用 cookie 作为 store，那么设置 encrypt: true, signed: false, httpOnly:true
