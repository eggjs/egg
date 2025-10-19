import { debuglog } from 'node:util';
import { type LoadUnitLifecycleContext, type LoadUnit } from '@eggjs/tegg-metadata';
import { type LifecycleHook, PrototypeUtil, QualifierUtil, EggQualifierAttribute, EggType } from '@eggjs/tegg';
import type { Application } from 'egg';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import {
  APP_CLAZZ_BLACK_LIST,
  CONTEXT_CLAZZ_BLACK_LIST,
  DEFAULT_APP_CLAZZ,
  DEFAULT_CONTEXT_CLAZZ,
} from './EggAppLoader.ts';

const debug = debuglog('egg/tegg/plugin/tegg/lib/EggQualifierProtoHook');

export class EggQualifierProtoHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async preCreate(ctx: LoadUnitLifecycleContext): Promise<void> {
    const clazzList = await ctx.loader.load();
    const appProperties = ObjectUtils.getProperties(this.app);
    const ctxProperties = ObjectUtils.getProperties(this.app.context);
    if (debug.enabled) {
      debug(
        'preCreate, get clazzList:%o, appProperties:%o, ctxProperties:%o, from unitPath:%o',
        clazzList.map(t => t.name),
        appProperties.length,
        ctxProperties.length,
        ctx.unitPath
      );
    }
    for (const clazz of clazzList) {
      const inbjectObjects = PrototypeUtil.getInjectObjects(clazz) || [];
      if (debug.enabled && inbjectObjects.length > 0) {
        debug(
          'preCreate, get injectObjects:%o, from clazz:%o, from unitPath:%o',
          inbjectObjects.map(t => t.refName),
          clazz.name,
          ctx.unitPath
        );
      }
      for (const injectObject of inbjectObjects) {
        const propertyQualifiers = QualifierUtil.getProperQualifiers(clazz, injectObject.refName);
        const hasEggQualifier = propertyQualifiers.find(t => t.attribute === EggQualifierAttribute);
        if (hasEggQualifier) {
          continue;
        }
        if (this.isCtxObject(injectObject.objName, ctxProperties)) {
          QualifierUtil.addProperQualifier(clazz, injectObject.refName, EggQualifierAttribute, EggType.CONTEXT);
        } else if (this.isAppObject(injectObject.objName, appProperties)) {
          QualifierUtil.addProperQualifier(clazz, injectObject.refName, EggQualifierAttribute, EggType.APP);
          debug(
            'preCreate, add proper qualifier:%o to clazz:%o, from unitPath:%o',
            injectObject.refName,
            clazz.name,
            ctx.unitPath
          );
        }
      }
    }
  }

  private isAppObject(name: PropertyKey, appProperties: string[]) {
    name = String(name);
    if (APP_CLAZZ_BLACK_LIST.includes(name)) {
      return false;
    }
    if (DEFAULT_APP_CLAZZ.includes(name)) {
      return true;
    }
    return appProperties.includes(name);
  }

  private isCtxObject(name: PropertyKey, ctxProperties: string[]) {
    name = String(name);
    if (CONTEXT_CLAZZ_BLACK_LIST.includes(name)) {
      return false;
    }
    if (DEFAULT_CONTEXT_CLAZZ.includes(name)) {
      return true;
    }
    return ctxProperties.includes(name);
  }
}
