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
    const redis = app.redis;
    await redis.set('foo', 'bar');
    const cacheValue = await redis.get('foo');
    ctx.body = cacheValue;
  }
}
