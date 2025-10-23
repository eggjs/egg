import Stream from 'node:stream';

// https://github.com/koajs/koa/blob/master/lib/is-stream.js
export function isStream(stream: any): stream is Stream.Readable {
  return (
    stream instanceof Stream ||
    (stream !== null &&
      typeof stream === 'object' &&
      !!stream.readable &&
      typeof stream.pipe === 'function' &&
      typeof stream.read === 'function' &&
      typeof stream.readable === 'boolean' &&
      typeof stream.readableObjectMode === 'boolean' &&
      typeof stream.destroy === 'function' &&
      typeof stream.destroyed === 'boolean')
  );
}
