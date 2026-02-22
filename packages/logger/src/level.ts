export const ALL = -Infinity;

/** Debug log for execute tracing */
export const DEBUG = 0;

/** Normal information logging */
export const INFO = 1;

/** Warning information logging */
export const WARN = 2;

/** Error or exception logging */
export const ERROR = 3;

export const NONE = Infinity;

export type LoggerLevel = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

export const levels: Record<string, number> = {
  ALL,
  DEBUG,
  INFO,
  WARN,
  ERROR,
  NONE,
};
