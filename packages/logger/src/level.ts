export const ALL: number = -Infinity;

/** Debug log for execute tracing */
export const DEBUG: number = 0;

/** Normal information logging */
export const INFO: number = 1;

/** Warning information logging */
export const WARN: number = 2;

/** Error or exception logging */
export const ERROR: number = 3;

export const NONE: number = Infinity;

export type LoggerLevel = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

export const levels: Record<string, number> = {
  ALL,
  DEBUG,
  INFO,
  WARN,
  ERROR,
  NONE,
};
