export interface DevelopmentConfig {
  /**
   * dirs needed watch, when files under these change, application will reload, use relative path
   */
  watchDirs: string[];
  /**
   * dirs don't need watch, including subdirectories, use relative path
   */
  ignoreDirs: string[];
  /**
   * don't wait all plugins ready, default is false.
   */
  fastReady: boolean;
  /**
   * whether reload on debug, default is true.
   */
  reloadOnDebug: boolean;
  /**
   * whether override default watchDirs, default is false.
   */
  overrideDefault: boolean;
  /**
   * whether override default ignoreDirs, default is false.
   */
  overrideIgnore: boolean;
  /**
   * whether to reload, use https://github.com/sindresorhus/multimatch
   */
  reloadPattern?: string[] | string;
}

export default {
  development: {
    watchDirs: [],
    ignoreDirs: [],
    fastReady: false,
    reloadOnDebug: true,
    overrideDefault: false,
    overrideIgnore: false,
    reloadPattern: undefined,
  } as DevelopmentConfig,
};
