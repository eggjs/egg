import { EOL } from 'node:os';
import { debuglog } from 'node:util';
import assert from 'node:assert';

const debug = debuglog('@eggjs/core/utils/timing');

export interface TimingItem {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  pid: number;
  index: number;
}

export class Timing {
  #enable: boolean;
  #startTime: number;
  #map: Map<string, TimingItem>;
  #list: TimingItem[];
  constructor() {
    this.#enable = true;
    this.#map = new Map();
    this.#list = [];
    this.init();
  }

  init() {
    // process start time
    this.start(
      'Process Start',
      Date.now() - Math.floor(process.uptime() * 1000)
    );
    this.end('Process Start');

    if (
      'scriptStartTime' in process &&
      typeof process.scriptStartTime === 'number'
    ) {
      // js script start execute time
      this.start('Script Start', process.scriptStartTime);
      this.end('Script Start');
    }
  }

  start(name?: string, start?: number) {
    if (!name || !this.#enable) return;

    if (this.#map.has(name)) {
      this.end(name);
    }

    start = start || Date.now();
    if (!this.#startTime) {
      this.#startTime = start;
    }
    const item: TimingItem = {
      name,
      start,
      pid: process.pid,
      index: this.#list.length,
    };
    this.#map.set(name, item);
    this.#list.push(item);
    debug('start %j', item);
    return item;
  }

  end(name?: string) {
    if (!name || !this.#enable) return;
    const item = this.#map.get(name);
    assert(item, `should run timing.start('${name}') first`);
    item.end = Date.now();
    item.duration = item.end - item.start;
    debug('end %j', item);
    return item;
  }

  enable() {
    this.#enable = true;
  }

  disable() {
    this.#enable = false;
  }

  clear() {
    this.#map.clear();
    this.#list = [];
  }

  toJSON() {
    return this.#list;
  }

  itemToString(timelineEnd: number, item: TimingItem, times: number) {
    const isEnd = typeof item.duration === 'number';
    const duration = isEnd
      ? (item.duration as number)
      : timelineEnd - item.start;
    const offset = item.start - this.#startTime;
    const status = `${duration}ms${isEnd ? '' : ' NOT_END'}`;
    const timespan = Math.floor(Number((offset * times).toFixed(6)));
    let timeline = Math.floor(Number((duration * times).toFixed(6)));
    timeline = timeline > 0 ? timeline : 1; // make sure there is at least one unit
    const message = `#${item.index} ${item.name}`;
    return (
      ' '.repeat(timespan) + '▇'.repeat(timeline) + ` [${status}] - ${message}`
    );
  }

  toString(prefix = 'egg start timeline:', width = 50) {
    const timelineEnd = Date.now();
    const timelineDuration = timelineEnd - this.#startTime;
    let times = 1;
    if (timelineDuration > width) {
      times = width / timelineDuration;
    }
    // follow https://github.com/node-modules/time-profile/blob/master/lib/profiler.js#L88
    return (
      prefix +
      EOL +
      this.#list
        .map(item => this.itemToString(timelineEnd, item, times))
        .join(EOL)
    );
  }
}
