import type { PartialEggConfig } from 'egg';

export default () => {
  const config = {} as PartialEggConfig;

  config.customLogger = {
    scheduleLogger: {
      consoleLevel: 'NONE',
      file: 'egg-schedule.log',
    },
  };

  config.schedule = {
    // custom additional directory, full path
    directory: [],
  };

  return config;
};
