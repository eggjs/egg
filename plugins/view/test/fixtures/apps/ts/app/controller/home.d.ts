import { Controller } from 'egg';
export default class HomeController extends Controller {
  index(): Promise<void>;
  other(): Promise<void>;
}
