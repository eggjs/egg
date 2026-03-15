import { Base } from 'sdk-base';

class RegistryClient extends Base {
  _registered: Map<string, string[]>;

  constructor() {
    super();
    this._registered = new Map();
    this.ready(true);
  }

  subscribe(reg: { dataId: string }, listener: (data: any) => void) {
    const key = reg.dataId;
    this.on(key, listener);

    const data = this._registered.get(key);
    if (data) {
      process.nextTick(() => listener(data));
    }
  }

  publish(reg: { dataId: string; publishData: string }) {
    const key = reg.dataId;

    let arr = this._registered.get(key);
    if (arr) {
      if (!arr.includes(reg.publishData)) {
        arr.push(reg.publishData);
      }
    } else {
      arr = [reg.publishData];
      this._registered.set(key, arr);
    }
    this.emit(key, arr);
  }

  close() {
    (this as any).closed = true;
  }
}

export default RegistryClient;
