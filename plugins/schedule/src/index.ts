import './types.ts';

import { definePluginFactory, type EggPluginFactory } from 'egg';

import Agent from './app/extend/agent.ts';
import Application from './app/extend/application.ts';
import ApplicationUnittest from './app/extend/application.unittest.ts';

export { Agent, Application, ApplicationUnittest };
export { ScheduleWorker } from './lib/schedule_worker.ts';
export { Scheduler } from './lib/schedule.ts';

export * from './lib/types.ts';

export default definePluginFactory({
  name: 'schedule',
  enable: true,
  path: import.meta.dirname,
}) as EggPluginFactory;
