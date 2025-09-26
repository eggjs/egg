import { defineConfig } from 'egg';

export default defineConfig({
  customLogger: {
    scheduleLogger: {
      consoleLevel: 'NONE',
      file: 'egg-schedule.log',
    },
  },
  schedule: {
    directory: [],
  },
});
