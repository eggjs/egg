import { Controller } from 'egg';

export default class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi cluster';
  }

  async publish() {
    const val = this.ctx.request.body.value;
    (this.ctx.app as any).registryClient.publish({
      dataId: 'demo.DemoService',
      publishData: val,
    });
    this.ctx.body = 'ok';
  }

  async getHosts() {
    const val = (this.ctx.app as any).val;
    this.ctx.body = val ? JSON.stringify(val) : '';
  }
}
