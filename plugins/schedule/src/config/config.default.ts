import { type PartialEggConfig } from 'egg';

export default {
  customLogger: {
    scheduleLogger: {
      consoleLevel: 'NONE',
      file: 'egg-schedule.log',
    },
  },
  schedule: {
    directory: [],
  },
} as PartialEggConfig;
