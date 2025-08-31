import assert from 'node:assert/strict';

import { request } from '@eggjs/supertest';

import { createApp, type Application } from '../helper.js';

describe('test/utils/router.test.ts', () => {
  let app: Application;
  before(async () => {
    app = createApp('router-app');
    await app.loader.loadAll();
    return app.ready();
  });
  after(() => app.close());

  describe('router.resources', () => {
    describe('normal', () => {
      it('should GET /posts', () => {
        return request(app.callback())
          .get('/posts')
          .expect(200)
          .expect('index');
      });

      it('should GET /posts/new', () => {
        return request(app.callback())
          .get('/posts/new')
          .expect(200)
          .expect('new');
      });

      it('should POST /posts', () => {
        return request(app.callback())
          .post('/posts')
          .expect(200)
          .expect('create');
      });

      it('should GET /posts/:id', () => {
        return request(app.callback())
          .get('/posts/123')
          .expect(200)
          .expect('show - 123');
      });

      it('should GET /posts/:id/edit', () => {
        return request(app.callback())
          .get('/posts/123/edit')
          .expect(200)
          .expect('edit - 123');
      });

      it('should PATCH /posts/:id', () => {
        return request(app.callback())
          .patch('/posts/123')
          .expect(200)
          .expect('update - 123');
      });

      it('should PUT /posts/:id', () => {
        return request(app.callback())
          .put('/posts/123')
          .expect(200)
          .expect('update - 123');
      });

      it('should DELETE /posts/:id', () => {
        return request(app.callback())
          .delete('/posts/123')
          .expect(200)
          .expect('destroy - 123');
      });
    });

    describe('controller url', () => {
      it('should GET /members', () => {
        return request(app.callback())
          .get('/members')
          .expect(200)
          .expect('index');
      });

      it('should GET /members/index', () => {
        return request(app.callback())
          .get('/members/index')
          .expect(200)
          .expect('index');
      });

      it('should GET /members/new', () => {
        return request(app.callback())
          .get('/members/new')
          .expect(200)
          .expect('new');
      });

      it('should GET /members/:id', () => {
        return request(app.callback())
          .get('/members/1231')
          .expect(200)
          .expect('show - 1231');
      });

      it('should POST /members', () => {
        return request(app.callback()).post('/members').expect(404);
      });

      it('should PUT /members/:id', () => {
        return request(app.callback()).put('/members/1231').expect(404);
      });

      it('should GET /POSTS', () => {
        return request(app.callback()).get('/POSTS').expect(404);
      });

      it('should GET /members/delete/:id', () => {
        return request(app.callback())
          .delete('/members/delete/1')
          .expect(200)
          .expect('delete - 1');
      });

      it('should GET /members/del/:id', () => {
        return request(app.callback())
          .del('/members/del/1')
          .expect(200)
          .expect('delete - 1');
      });

      it('should GET /packages/(.*)', () => {
        return request(app.callback()).get('/packages/urllib').expect('urllib');
      });
    });

    describe('no name', () => {
      it('should GET /comments', () => {
        return request(app.callback())
          .get('/comments')
          .expect('index')
          .expect(200);
      });

      it('should POST /comments', () => {
        return request(app.callback())
          .post('/comments')
          .expect('new')
          .expect(200);
      });
    });

    describe('async controller', () => {
      it('should execute by the correct order', () => {
        return request(app.callback())
          .get('/mix')
          .expect(['generator before', 'async', 'generator after'])
          .expect(200);
      });
    });
  });

  describe('router.url', () => {
    it('should work', () => {
      assert(app.url('posts') === '/posts');

      assert(app.router.url('posts') === '/posts');
      assert(app.router.url('members') === '/members');
      assert(app.router.url('post', { id: 1 }) === '/posts/1');
      assert(app.router.url('member', { id: 1 }) === '/members/1');
      assert(app.router.url('new_post') === '/posts/new');
      assert(app.router.url('new_member') === '/members/new');
      assert(app.router.url('edit_post', { id: 1 }) === '/posts/1/edit');
      assert(app.router.url('params', { a: 1, b: 2 }) === '/params/1/2');
      // no match params
      assert(app.router.url('edit_post', {}) === '/posts/:id/edit');
      assert(app.router.url('noname') === '');
      assert(
        app.router.url('comment_index', { id: 1, a: 1 }) ===
          '/comments/1?filter=&a=1'
      );
    });

    it('should work with unknow params', () => {
      assert(
        app.router.url('posts', { name: 'foo', page: 2 }) ===
          '/posts?name=foo&page=2'
      );
      assert(
        app.router.url('posts', { name: 'foo&?', page: 2 }) ===
          '/posts?name=foo%26%3F&page=2'
      );
      assert(
        app.router.url('edit_post', { id: 10, page: 2 }) ===
          '/posts/10/edit?page=2'
      );
      assert(
        app.router.url('edit_post', { i: 2, id: 10 }) === '/posts/10/edit?i=2'
      );
      assert(
        app.router.url('edit_post', {
          id: 10,
          page: 2,
          tags: ['chair', 'develop'],
        }) === '/posts/10/edit?page=2&tags=chair&tags=develop'
      );
      assert(
        app.router.url('edit_post', {
          id: [10],
          page: [2],
          tags: ['chair', 'develop'],
        }) === '/posts/10/edit?page=2&tags=chair&tags=develop'
      );
      assert(
        app.router.url('edit_post', {
          id: [10, 11],
          page: [2],
          tags: ['chair', 'develop'],
        }) === '/posts/10/edit?page=2&tags=chair&tags=develop'
      );
    });

    it('should not support regular url', () => {
      assert.throws(() => {
        app.router.url('packages', ['urllib'] as any);
      }, "Can't get the url for regExp /^/packages/(.*)/ for by name 'posts'");
    });
  });

  describe('router.pathFor', () => {
    it('should work', () => {
      assert(app.router.pathFor('posts') === '/posts');
    });
  });

  describe('router.method', () => {
    it('router method include HEAD', () => {
      assert(app.router.methods.includes('HEAD'));
    });
  });

  describe('router middleware', () => {
    it('should support all kinds of middlewares', () => {
      return request(app.callback())
        .get('/middleware')
        .expect(200)
        .expect(['generator', 'async', 'common']);
    });

    it('should support all kinds of middlewares with name', () => {
      return request(app.callback())
        .get('/named_middleware')
        .expect(200)
        .expect(['generator', 'async', 'common']);
    });

    it('should support all kinds of middlewares with register', () => {
      return request(app.callback())
        .get('/register_middleware')
        .expect(200)
        .expect(['generator', 'async', 'common']);
    });

    it('should app.router support all kinds of middlewares', () => {
      return request(app.callback())
        .get('/router_middleware')
        .expect(200)
        .expect(['generator', 'async', 'common']);
    });
  });

  describe('redirect', () => {
    it('should app.redirect to target', () => {
      return request(app.callback())
        .get('/redirect')
        .expect(302)
        .expect('location', '/middleware');
    });

    it('should app.router.redirect to target', () => {
      return request(app.callback())
        .get('/router_redirect')
        .expect(301)
        .expect('location', '/middleware');
    });
  });

  describe('controller mutli url', () => {
    it('should GET /url1', () => {
      return request(app.callback()).get('/url1').expect(200).expect('index');
    });
    it('should GET /url2', () => {
      return request(app.callback()).get('/url2').expect(200).expect('index');
    });
    it('use middlewares /urlm1', () => {
      return request(app.callback())
        .get('/urlm1')
        .expect(200)
        .expect(['generator', 'async', 'common']);
    });
    it('use middlewares /urlm2', () => {
      return request(app.callback())
        .get('/urlm2')
        .expect(200)
        .expect(['generator', 'async', 'common']);
    });
  });

  describe('controller not exist', () => {
    it('should check when app.router.VERB', () => {
      try {
        app.router.get('/test', app.controller.not_exist);
        throw new Error('should not run here');
      } catch (err: any) {
        assert(err.message.includes('controller not exists'));
      }
    });

    it('should check when app.router.VERB with controller string', () => {
      try {
        app.get('/hello', 'not.exist.controller');
        throw new Error('should not run here');
      } catch (err: any) {
        assert.match(
          err.message,
          /app\.controller\.not\.exist\.controller not exists/
        );
      }
    });

    it('should check when app.router.resources', () => {
      try {
        app.router.resources('/test', app.controller.not_exist);
        throw new Error('should not run here');
      } catch (err: any) {
        assert.match(err.message, /controller not exists/);
      }
    });

    it('should check when app.router.resources with controller string', () => {
      try {
        app.router.resources('/test', 'not.exist.controller');
        throw new Error('should not run here');
      } catch (err: any) {
        assert.match(
          err.message,
          /app\.controller\.not\.exist\.controller not exists/
        );
      }
    });
  });

  describe('router middleware', () => {
    before(async () => {
      app = createApp('router-in-app');
      await app.loader.loadAll();
      return app.ready();
    });

    after(() => app.close());

    it('should always load router middleware at last', () => {
      return request(app.callback()).get('/').expect(200).expect('foo');
    });
  });
});
