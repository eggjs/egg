import { LogRotator } from '../../lib/rotator.ts';

const extensions: {
  LogRotator: typeof LogRotator;
} = {
  LogRotator,
};

export default extensions;
