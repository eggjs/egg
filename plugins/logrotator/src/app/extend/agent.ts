import { LogRotator } from '../../lib/rotator.ts';

// egg-schedule will load both at app and agent, so we should mount it for compatible
const extensions: {
  LogRotator: typeof LogRotator;
} = {
  LogRotator,
};

export default extensions;
