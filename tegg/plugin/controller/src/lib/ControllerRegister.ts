import { type LoadUnit } from '@eggjs/tegg-metadata';

import { RootProtoManager } from './RootProtoManager.ts';

export interface ControllerRegister {
  register(rootProtoManager: RootProtoManager, loadUnit?: LoadUnit): Promise<void>;
}
