export interface TeggManifestModuleReference {
  name: string;
  package?: string;
  path: string;
  optional?: boolean;
  loaderType?: string;
}

export interface TeggManifestModuleDescriptor {
  name: string;
  unitPath: string;
  optional?: boolean;
  /** Files containing decorated classes, relative to unitPath. */
  decoratedFiles: string[];
}

/** Host-neutral tegg metadata used directly by standalone and by Egg at extensions.tegg. */
export interface TeggManifest {
  moduleReferences: TeggManifestModuleReference[];
  moduleDescriptors: TeggManifestModuleDescriptor[];
}
