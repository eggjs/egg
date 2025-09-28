import { LogRotator } from '../../lib/rotator.ts';

// egg-schedule will load both at app and agent, so we should mount it for compatible
export default {
  LogRotator,
};
