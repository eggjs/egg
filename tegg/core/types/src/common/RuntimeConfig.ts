export type EnvType = 'local' | 'unittest' | 'prod' | string;

export interface RuntimeConfig {
  /**
   * Application name
   */
  name: string;

  /**
   * Application environment
   */
  env: EnvType;

  /**
   * Application directory
   */
  baseDir: string;
}
