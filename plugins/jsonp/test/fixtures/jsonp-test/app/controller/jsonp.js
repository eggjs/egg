exports.index = ctx => {
  ctx.body = { foo: 'bar' };
};

exports.empty = function () {};

exports.mark = ctx => {
  ctx.body = { jsonpFunction: ctx.acceptJSONP };
};

exports.error = async () => {
  throw new Error('jsonpFunction is error');
};
