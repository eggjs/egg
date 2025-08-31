module.exports = function (app) {
  app.get('/locals/router', app.controller.locals.router);
  app.get('member_index', '/members/index', 'members.index');
  app.resources('posts', '/posts', 'posts');
  app.resources('members', '/members', app.controller.members);
};
