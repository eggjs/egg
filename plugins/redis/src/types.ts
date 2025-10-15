import type { Singleton } from "egg";
import type { Redis } from "ioredis";

import type { RedisConfig } from "./config/config.default.ts";

declare module "egg" {
  interface EggAppConfig {
    /**
     * Redis plugin config
     */
    redis: RedisConfig;
  }

  interface EggApplicationCore {
    redis: Redis & Singleton<Redis>;
  }
}
