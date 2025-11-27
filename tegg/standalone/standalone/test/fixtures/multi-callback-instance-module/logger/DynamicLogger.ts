import fs from 'node:fs';
import { EOL } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';

import {
  MultiInstanceProto,
  type MultiInstancePrototypeGetObjectsContext,
  LifecycleInit,
  LifecycleDestroy,
  QualifierUtil,
  type EggProtoImplClass,
  AccessLevel,
} from '@eggjs/tegg';
import { type EggObject, ModuleConfigUtil, type EggObjectLifeCycleContext } from '@eggjs/tegg/helper';

export const LOG_PATH_ATTRIBUTE: symbol = Symbol.for('LOG_PATH_ATTRIBUTE') as symbol;

export function LogPath(name: string) {
  return function (target: any, propertyKey: PropertyKey): void {
    QualifierUtil.addProperQualifier(target.constructor as EggProtoImplClass, propertyKey, LOG_PATH_ATTRIBUTE, name);
  };
}

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath);
    const logger = (config as any)?.features?.logger;
    if (!logger) {
      return [];
    }
    return logger.map((name: string) => {
      return {
        name: 'dynamicLogger',
        qualifiers: [
          {
            attribute: LOG_PATH_ATTRIBUTE,
            value: name,
          },
        ],
      };
    });
  },
})
export class DynamicLogger {
  stream: Writable;
  loggerName: string;

  @LifecycleInit()
  async init(ctx: EggObjectLifeCycleContext, obj: EggObject): Promise<void> {
    const loggerName = obj.proto.getQualifier(LOG_PATH_ATTRIBUTE);
    this.loggerName = loggerName as string;
    this.stream = fs.createWriteStream(path.join(ctx.loadUnit.unitPath, `${loggerName}.log`));
  }

  @LifecycleDestroy()
  async destroy(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.stream.end((err: any) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  info(msg: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.stream.write(msg + EOL, (err: any) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }
}
