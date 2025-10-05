import { Controller, Singleton } from 'egg';
import { Redis } from 'ioredis';

declare module 'egg' {
  interface IController {
    home: HomeController;
  }

  interface EggApplicationCore {
    redis: Redis & Singleton<Redis>;
  }
}

export default class HomeController extends Controller {
  async index() {
    const { ctx, app } = this;
    // @deprecated please use `getSingletonInstance(id)` instead
    const redis = app.redis.get('cache') as unknown as Redis;
    await redis.set('foo', 'bar');
    const redis2 = app.redis.getSingletonInstance('cache');
    await redis2.set('foo2', 'bar2');
    ctx.body = await redis.get('foo');
  }
}
