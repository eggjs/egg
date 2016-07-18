'use strict';

const request = require('supertest-as-promised');
const utils = require('../../utils');

describe('test/lib/core/router.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/router-app');
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
        return request(app.callback())
          .post('/members')
          .expect(404);
      });

      it('should PUT /members/:id', () => {
        return request(app.callback())
          .put('/members/1231')
          .expect(404);
      });

      it('should GET /POSTS', () => {
        return request(app.callback())
          .get('/POSTS')
          .expect(404);
      });
    });
  });

  describe('router.url', () => {
    it('should work', () => {
      app.router.url('posts').should.equal('/posts');
      app.router.url('members').should.equal('/members');
      app.router.url('post', { id: 1 }).should.equal('/posts/1');
      app.router.url('member', { id: 1 }).should.equal('/members/1');
      app.router.url('new_post').should.equal('/posts/new');
      app.router.url('new_member').should.equal('/members/new');
      app.router.url('edit_post', { id: 1 }).should.equal('/posts/1/edit');
    });

    it('should work with unknow params', () => {
      app.router.url('posts', { name: 'foo', page: 2 }).should.equal('/posts?name=foo&page=2');
      app.router.url('posts', { name: 'foo&?', page: 2 }).should.equal('/posts?name=foo%26%3F&page=2');
      app.router.url('edit_post', { id: 10, page: 2 }).should.equal('/posts/10/edit?page=2');
      app.router.url('edit_post', { i: 2, id: 10 }).should.equal('/posts/10/edit?i=2');
      app.router.url('edit_post', { id: 10, page: 2, tags: [ 'chair', 'develop' ] })
        .should.equal('/posts/10/edit?page=2&tags=chair&tags=develop');
      app.router.url('edit_post', { id: [ 10 ], page: [ 2 ], tags: [ 'chair', 'develop' ] })
        .should.equal('/posts/10/edit?page=2&tags=chair&tags=develop');
      app.router.url('edit_post', { id: [ 10, 11 ], page: [ 2 ], tags: [ 'chair', 'develop' ] })
        .should.equal('/posts/10/edit?page=2&tags=chair&tags=develop');
    });

    it.skip('should have router var in view', () => {
      return request(app.callback())
        .get('/locals/router')
        .expect('posts: /posts');
    });
  });

  describe('router.pathFor', () => {
    it('should work', () => {
      app.router.pathFor('posts').should.equal('/posts');
    });
  });

  describe('router.method', () => {
    it('router method include HEAD', () => {
      app.router.methods.should.containEql('HEAD');
    });
  });
});
