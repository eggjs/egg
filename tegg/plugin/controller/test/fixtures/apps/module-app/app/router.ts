import type { Application } from 'egg';

export default function (app: Application) {
  app.get('/apps2/:id', app.controller.appController2.foo);
}
