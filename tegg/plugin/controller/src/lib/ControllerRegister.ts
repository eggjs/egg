import type { LoadUnit } from '@eggjs/metadata';

import { RootProtoManager } from './RootProtoManager.ts';

export interface ControllerRegister {
  register(rootProtoManager: RootProtoManager, loadUnit?: LoadUnit): Promise<void>;
}
