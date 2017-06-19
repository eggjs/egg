import * as EggType from 'egg-type';
interface Context extends EggType.Context {
  service: IService;
  app: Application;
}

declare class BaseContextClass extends EggType.BaseContextClass {
  /**
   * request context
   */
  ctx: Context;

  /**
   * Application
   */
  app: Application;

  /**
   * Application config object
   */
  config: EggAppConfig;

  /**
   * service
   */
  service: IService;
}

export interface Application extends EggType.Application {
  controller: IController;
  config: EggAppConfig;
}

export interface EggAppConfig extends EggType.EggAppConfig { }

export interface IService { }// tslint:disable-line
export interface IController { } // tslint:disable-line

export class Controller extends BaseContextClass { }

export class Service extends BaseContextClass { }
