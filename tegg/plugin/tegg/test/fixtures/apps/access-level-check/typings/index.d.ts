import MainService from '../modules/module-main/MainService.js';

declare module 'egg' {
  export interface EggModule {
    moduleMain: {
      mainService: MainService;
    };
  }
}
