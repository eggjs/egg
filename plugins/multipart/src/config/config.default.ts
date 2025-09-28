import os from 'node:os';
import path from 'node:path';

import type { Context, EggAppInfo } from 'egg';
import type { PathMatchingPattern } from 'egg-path-matching';

export type MatchItem = string | RegExp | ((ctx: Context) => boolean);

/**
 * multipart parser options
 * @member Config#multipart
 */
export interface MultipartConfig {
  /**
   * which mode to handle multipart request, default is `stream`, the hard way.
   * If set mode to `file`, it's the easy way to handle multipart request and save it to local files.
   * If you don't know the Node.js Stream work, maybe you should use the `file` mode to get started.
   */
  mode: 'stream' | 'file';
  /**
   * special url to use file mode when global `mode` is `stream`.
   */
  fileModeMatch?: PathMatchingPattern;
  /**
   * Auto set fields to parts, default is `false`.
   * Only work on `stream` mode.
   * If set true，all fields will be auto handle and can access by `parts.fields`
   */
  autoFields: boolean;
  /**
   * default charset encoding, don't change it before you real know about it
   * Default is `utf8`
   */
  defaultCharset: string;
  /**
   * For multipart forms, the default character set to use for values of part header parameters (e.g. filename)
   * that are not extended parameters (that contain an explicit charset), don't change it before you real know about it
   * Default is `utf8`
   */
  defaultParamCharset: string;
  /**
   * Max field name size (in bytes), default is `100`
   */
  fieldNameSize: number;
  /**
   * Max field value size (in bytes), default is `100kb`
   */
  fieldSize: string | number;
  /**
   * Max number of non-file fields, default is `10`
   */
  fields: number;
  /**
   * Max file size (in bytes), default is `10mb`
   */
  fileSize: string | number;
  /**
   * Max number of file fields, default is `10`
   */
  files: number;
  /**
   * Add more ext file names to the `whitelist`, default is `[]`, only valid when `whitelist` is `null`
   */
  fileExtensions: string[];
  /**
   * The white ext file names, default is `null`
   */
  whitelist: string[] | ((filename: string) => boolean) | null;
  /**
   * Allow array field, default is `false`
   */
  allowArrayField: boolean;
  /**
   * The directory for temporary files. Only work on `file` mode.
   * Default is `os.tmpdir()/egg-multipart-tmp/${appInfo.name}`
   */
  tmpdir: string;
  /**
   * The schedule for cleaning temporary files. Only work on `file` mode.
   */
  cleanSchedule: {
    /**
     * The cron expression for the schedule.
     * Default is `0 30 4 * * *`
     * @see https://github.com/eggjs/egg/tree/next/plugins/schedule#cron-style-scheduling
     */
    cron: string;
    /**
     * Default is `false`
     */
    disable: boolean;
  };
  checkFile?(fieldname: string, file: any, filename: string, encoding: string, mimetype: string): void | Error;
}

export default (appInfo: EggAppInfo) => {
  return {
    multipart: {
      mode: 'stream',
      autoFields: false,
      defaultCharset: 'utf8',
      defaultParamCharset: 'utf8',
      fieldNameSize: 100,
      fieldSize: '100kb',
      fields: 10,
      fileSize: '10mb',
      files: 10,
      fileExtensions: [],
      whitelist: null,
      allowArrayField: false,
      tmpdir: path.join(os.tmpdir(), 'egg-multipart-tmp', appInfo.name),
      cleanSchedule: {
        cron: '0 30 4 * * *',
        disable: false,
      },
    } as MultipartConfig,
  };
};

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    multipart: MultipartConfig;
  }
}
