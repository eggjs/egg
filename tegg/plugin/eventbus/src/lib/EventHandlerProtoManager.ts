import type { Application } from 'egg';
import type { EggPrototype } from '@eggjs/tegg-metadata';
import { EventContextFactory, EventHandlerFactory } from '@eggjs/tegg-eventbus-runtime';
import { EVENT_NAME, type EventName } from '@eggjs/eventbus-decorator';

import { eggEventContextFactory } from './EggEventContext.ts';

export class EventHandlerProtoManager {
  private readonly protos: Set<EggPrototype> = new Set();
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  addProto(proto: EggPrototype): void {
    this.protos.add(proto);
  }

  async register(): Promise<void> {
    const eventHandlerFactory = await this.app.getEggObject(EventHandlerFactory);
    for (const proto of this.protos) {
      const eventList = (proto.getMetaData(EVENT_NAME) as EventName[]) ?? [];
      eventList.forEach((event) => eventHandlerFactory.registerHandler(event, proto));
    }

    const eventFactory = await this.app.getEggObject(EventContextFactory);
    const createContextFactory = eggEventContextFactory(this.app.abstractEggContext, this.app.identicalUtil);
    eventFactory.registerContextCreator(createContextFactory(this.app));
  }

  getProtos(): EggPrototype[] {
    return Array.from(this.protos);
  }
}
