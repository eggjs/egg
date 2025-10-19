import type { EggObjectName } from './InjectObjectInfo.ts';

export interface InjectConstructorInfo {
  /**
   * inject args index
   */
  refIndex: number;
  /**
   * inject args name
   */
  refName: string;
  /**
   * obj's name will be injected
   */
  objName: EggObjectName;
  /**
   * optional inject
   */
  optional?: boolean;
}
