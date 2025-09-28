'use strict';

module.exports = app => {
  app.get('/', ctx => {
    ctx.body = ctx.__(ctx.query.key);
  });

  app.get('/renderString', async ctx => {
    const tpl = `<li>\{{__('Email')}}: \{{user.email}}</li>
<li>\{{gettext('Hello %s, how are you today?', user.name)}}</li>
<li>\{{__('%s %s', 'foo', 'bar')}}</li>
`;

    ctx.body = await ctx.renderString(tpl, {
      user: {
        name: 'fengmk2',
      },
    });
  });
};
