export interface PackageEgg {
  framework?: boolean;
  typescript?: boolean;
  tscompiler?: string;
  declarations?: boolean;
  revert?: string | string[];
  require?: string | string[];
  import?: string | string[];
}
