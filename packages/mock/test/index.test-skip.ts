// import mm from '../index';
// import * as path from 'path';
// const fixtures = path.join(__dirname, 'fixtures');

// const app = mm.app({
//   baseDir: path.join(fixtures, 'demo'),
// });
// app.ready().then(() => {
//   app.httpRequest()
//   app.mockContext({
//     user: { name: 'Jason' }
//   });

//   app.mockCookies({
//     foo: 'bar'
//   });

//   app.mockSession({
//     foo: 'bar'
//   });

//   app.mockContext();

//   app.mockService('foo', 'get', function* (ctx, methodName, args) {
//     return 'popomore';
//   });

//   app.mockServiceError('foo', 'get', new Error('mock error'));

//   app.mockCsrf();

//   app.mockHttpclient('https://eggjs.org', 'mock egg');
//   app.mockHttpclient('https://eggjs.org', {
//     data: 'mock egg',
//     status: 200,
//   });

//   app.mockHttpclient('https://eggjs.org', [ 'get' , 'head' ], { data: 'foo' });

//   app.mockHttpclient('https://eggjs.org', '*', { data: 'bar' });

//   app.mockHttpclient('https://eggjs.org', () => ({
//     data: 'mock egg',
//     status: 200,
//   }));

//   app.mockHttpclient('https://eggjs.org', function (url, opts) {
//     url.toLowerCase();
//     opts.data;
//     return 'a';
//   });

//   app.httpRequest().post('/user').set('a', 'b').send().expect(200);

//   console.log('   ts run ok');
//   app.close();
//   mm.restore();
//   process.exit(0);
// }).catch(e => {
//   console.log(e);
//   process.exit(1);
// });

// mm.consoleLevel('INFO');

// mm.home('a')

// // mm.cluster();

// mm.env('test');

// // test for bootstrap
// (global as any).before = () => {};
// (global as any).afterEach = () => {};

// import { mock, app as bootApp, assert } from '../bootstrap';
// bootApp.ready;
// mock.restore;
// assert(true);
// mock.app;
