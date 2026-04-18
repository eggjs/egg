export interface FetchEvent extends Event {
  request: Request;
  waitUntil(f: Promise<any>): void;
  respondWith(r: Response | PromiseLike<Response>): void;
}
