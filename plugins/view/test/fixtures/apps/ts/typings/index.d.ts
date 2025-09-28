import 'egg';

import HomeController from '../app/controller/home.ts';

declare module 'egg' {
  interface IController {
    home: HomeController;
  }
}
