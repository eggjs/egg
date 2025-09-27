import { LogRotator } from '../../lib/rotator.ts';

export default {
  LogRotator,
};

declare module 'egg' {
  interface Application {
    LogRotator: typeof LogRotator;
  }
}
