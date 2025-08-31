export interface EggAppInfo {
  /** package.json */
  pkg: Record<string, any>;
  /** the application name from package.json */
  name: string;
  /** current directory of application */
  baseDir: string;
  /** equals to serverEnv */
  env: string;
  /** equals to serverScope */
  scope: string;
  /** home directory of the OS */
  HOME: string;
  /** baseDir when local and unittest, HOME when other environment */
  root: string;
}

export interface EggPluginInfo {
  /** the plugin name, it can be used in `dep` */
  name: string;
  /** the package name of plugin */
  package?: string;
  version?: string;
  /** whether enabled */
  enable: boolean;
  implicitEnable?: boolean;
  /** the directory of the plugin package */
  path?: string;
  /** the dependent plugins, you can use the plugin name */
  dependencies: string[];
  /** the optional dependent plugins. */
  optionalDependencies: string[];
  dependents?: string[];
  /** specify the serverEnv that only enable the plugin in it */
  env: string[];
  /** the file plugin config in. */
  from: string;
}

export interface CustomLoaderConfigItem {
  /** the directory of the custom loader */
  directory: string;
  /** the inject object, it can be app or ctx */
  inject: string;
  /** whether load unit files */
  loadunit?: boolean;
}

export interface EggAppConfig extends Record<string, any> {
  coreMiddleware: string[];
  middleware: string[];
  customLoader?: Record<string, CustomLoaderConfigItem>;
  controller?: {
    supportParams?: boolean;
  };
}
