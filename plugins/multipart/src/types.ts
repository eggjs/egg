import type { MultipartConfig } from './config/config.default.ts';
import type { EggFile, MultipartFileStream, MultipartOptions } from './app/extend/context.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * multipart parser options
     * @member Config#multipart
     */
    multipart: MultipartConfig;
  }

  interface Request {
    /**
     * Files Object Array
     */
    files?: EggFile[];
  }

  interface Context {
    saveRequestFiles(options?: MultipartOptions): Promise<void>;
    getFileStream(options?: MultipartOptions): Promise<MultipartFileStream>;
    cleanupRequestFiles(files?: EggFile[]): Promise<void>;
  }
}
