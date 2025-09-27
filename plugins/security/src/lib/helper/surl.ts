import type { BaseContextClass } from 'egg';

const escapeMap: Record<string, string> = {
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#x27;',
};

export default function surl(this: BaseContextClass, val: string) {
  // Just get the converted the protocolWhiteList in `Set` mode,
  // Avoid conversions in `foreach`
  const protocolWhiteListSet = this.app.config.security.__protocolWhiteListSet!;

  if (typeof val !== 'string') {
    return val;
  }

  // only test on absolute path
  if (val[0] !== '/') {
    const arr = val.split('://', 2);
    const protocol = arr.length > 1 ? arr[0].toLowerCase() : '';
    if (protocol === '' || !protocolWhiteListSet.has(protocol)) {
      if (this.app.config.env === 'local') {
        this.ctx.coreLogger.warn(
          '[@eggjs/security/surl] url: %j, protocol: %j, ' +
            'protocol is empty or not in white list, convert to empty string',
          val,
          protocol
        );
      }
      return '';
    }
  }

  return val.replace(/["'<>]/g, ch => {
    return escapeMap[ch];
  });
}
