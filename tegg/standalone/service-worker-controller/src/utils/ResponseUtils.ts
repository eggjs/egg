import { Readable } from 'node:stream';

export class ResponseUtils {
  /**
   * The unified error shape for framework-generated failures (routing 404,
   * unhandled controller errors): `{ code, message }` JSON. Controller-crafted
   * Responses pass through untouched.
   */
  static createErrorResponse(status: number, code: string, message: string): Response {
    return new Response(JSON.stringify({ code, message }), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static createResponseByBody(body: any): Response {
    if (typeof body === 'undefined' || body === null) {
      return new Response(null, { status: 204 });
    }
    if (
      typeof body === 'string' ||
      body instanceof ReadableStream ||
      // Buffer is a Uint8Array; also cover the other web-standard BodyInit types
      // so a controller returning binary/form bodies is not JSON-serialized.
      body instanceof Uint8Array ||
      body instanceof ArrayBuffer ||
      body instanceof Blob ||
      body instanceof URLSearchParams ||
      body instanceof FormData ||
      ArrayBuffer.isView(body)
    ) {
      return new Response(body as BodyInit, { status: 200 });
    }
    if (body instanceof Readable) {
      return new Response(Readable.toWeb(body) as unknown as ReadableStream, { status: 200 });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
