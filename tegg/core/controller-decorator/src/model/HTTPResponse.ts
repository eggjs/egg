const HTTPResponseBase: { new (): any } = (typeof Response !== 'undefined' ? Response : Object) as { new (): any };
export class HTTPResponse extends HTTPResponseBase {}
