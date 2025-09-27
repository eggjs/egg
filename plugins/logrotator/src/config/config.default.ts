/**
 * logrotator options
 * @member Config#logrotator
 */
export interface LogrotatorConfig {
  /**
   * Disable rotate by day
   *
   * Default: `false`
   */
  disableRotateByDay: boolean;
  /**
   * List of files that will be rotated by hour
   *
   * Default: `null`
   */
  filesRotateByHour: string[] | null;
  /**
   * Hour delimiter
   *
   * Default: `-`
   */
  hourDelimiter: string;
  /**
   * List of files that will be rotated by size
   *
   * Default: `null`
   */
  filesRotateBySize: string[] | null;
  /**
   * Max file size to judge if any file need rotate
   *
   * Default: `50 * 1024 * 1024`
   */
  maxFileSize: number;
  /**
   * Max files to keep
   *
   * Default: `10`
   */
  maxFiles: number;
  /**
   * Time interval to judge if any file need rotate
   *
   * Default: `60000`
   */
  rotateDuration: number;
  /**
   * Max days to keep log files, set `0` to keep all logs.
   *
   * Default: `31`
   */
  maxDays: number;
  /**
   * Enable gzip compression for rotated files
   *
   * Default: `false`
   */
  gzip: boolean;
}

export default {
  logrotator: {
    disableRotateByDay: false,
    filesRotateByHour: null,
    hourDelimiter: '-',
    filesRotateBySize: null,
    maxFileSize: 50 * 1024 * 1024,
    maxFiles: 10,
    rotateDuration: 60_000,
    maxDays: 31,
    gzip: false,
  } as LogrotatorConfig,
};
