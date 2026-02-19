import { Stream } from 'node:stream';

export class StreamUtil {
  static isStream(obj: any): boolean {
    return obj instanceof Stream;
  }
}
