import type { LoadUnit } from '@eggjs/metadata';

import type { RootProtoManager } from './RootProtoManager.ts';

export interface ControllerRegister {
  register(rootProtoManager: RootProtoManager, loadUnit?: LoadUnit): Promise<void>;
}
