'use strict';

import { Controller } from 'egg';

export default class HomeController extends Controller {
  public async index() {
    const obj: PlainObject = {};
    obj.text = 'hi, egg';
    this.ctx.body = obj.text;
  }
}
