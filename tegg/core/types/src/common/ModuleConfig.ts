export interface ModuleReference {
  name: string;
  path: string;
  optional?: boolean;
  loaderType?: string;
}

export interface InlineModuleReferenceConfig {
  path: string;
  optional?: boolean;
}

export interface NpmModuleReferenceConfig {
  package: string;
  optional?: boolean;
}

export type ModuleReferenceConfig = InlineModuleReferenceConfig | NpmModuleReferenceConfig;

export interface ModuleConfig {}

export interface ReadModuleReferenceOptions {
  // module dir deep for globby when use auto scan module
  // default is 10
  deep?: number;
  cwd?: string;
  extraFilePattern?: string[];
}

export interface ModuleConfigHolder {
  name: string;
  config: ModuleConfig;
  reference: ModuleReference;
}
