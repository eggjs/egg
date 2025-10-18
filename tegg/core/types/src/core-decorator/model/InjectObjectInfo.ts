export type EggObjectName = PropertyKey;

export interface InjectObjectInfo {
  /**
   * property name obj inject to
   */
  refName: PropertyKey;
  /**
   * obj's name will be injected
   */
  objName: EggObjectName;
  /**
   * optional inject
   */
  optional?: boolean;
}
