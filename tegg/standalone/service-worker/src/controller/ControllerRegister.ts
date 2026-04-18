import { RootProtoManager } from './RootProtoManager.ts';

export interface ControllerRegister {
  register(rootProtoManager: RootProtoManager): Promise<void>;
}
