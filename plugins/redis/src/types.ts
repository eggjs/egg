import type { Singleton } from '@eggjs/core';
import type { Redis } from 'ioredis';
import type { RedisConfig } from './config/config.default.ts';

declare module 'egg' {
  interface EggAppConfig {
    redis: RedisConfig;
  }

  interface Application {
    redis: Redis & Singleton<Redis>;
  }

  interface Agent {
    redis: Redis & Singleton<Redis>;
  }
}
