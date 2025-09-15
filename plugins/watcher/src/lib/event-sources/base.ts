import { Base } from 'sdk-base';

export abstract class BaseEventSource extends Base {
  abstract watch(file: string): void;
  abstract unwatch(file: string): void;
}
