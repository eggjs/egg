module.exports = async ctx => {
  ctx.cookies.set('foo', 'bar');
  ctx.body = 'hello';
};
