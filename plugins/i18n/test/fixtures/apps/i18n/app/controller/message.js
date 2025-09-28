module.exports = async ctx => {
  ctx.body = {
    message: ctx.__('Hello %s, how are you today? How was your %s.', 'fengmk2', 18),
    empty: ctx.__(),
    notexists_key: ctx.__('key not exists'),
    empty_string: ctx.__(''),
    novalue: ctx.__('key %s ok'),
    arguments3: ctx.gettext('%s %s %s', 1, 2, 3),
    arguments4: ctx.gettext('%s %s %s %s', 1, 2, 3, 4),
    arguments5: ctx.__('%s %s %s %s %s', 1, 2, 3, 4, 5),
    arguments6: ctx.__('%s %s %s %s %s.', 1, 2, 3, 4, 5, 6),
    values: ctx.__('{0} {1} {0} {1} {2} {100}', ['foo', 'bar']),
  };
};
