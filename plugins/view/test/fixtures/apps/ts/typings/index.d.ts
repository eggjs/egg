import 'egg';
import HomeController from '../app/controller/home';

declare module 'egg' {
  interface IController {
    home: HomeController;
  }
}
