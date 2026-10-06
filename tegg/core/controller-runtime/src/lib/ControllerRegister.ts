import type { LoadUnit } from '@eggjs/metadata';

export interface ControllerRegister {
  register(loadUnit?: LoadUnit): Promise<void>;
}
