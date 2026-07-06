import { ContextProto, HTTPController, HTTPMethod, HTTPMethodEnum, Inject, InjectContext } from '@eggjs/tegg';
import type { EggObjectLifecycle } from '@eggjs/tegg-types';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@ContextProto()
export class StreamProbeService implements EggObjectLifecycle {
  destroyed = false;

  chunk(index: number): string {
    return this.destroyed ? 'DEAD' : `chunk-${index}`;
  }

  async preDestroy(): Promise<void> {
    this.destroyed = true;
  }
}

@HTTPController({ path: '/stream' })
export class StreamController {
  @Inject()
  private readonly streamProbeService: StreamProbeService;

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/sse' })
  async sse() {
    const probe = this.streamProbeService;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        for (let i = 0; i < 3; i++) {
          // stay slower than the ctx-destroy tick so a missing stream guard
          // surfaces as DEAD chunks
          await sleep(30);
          controller.enqueue(encoder.encode(`data: ${probe.chunk(i)}\n\n`));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'content-type': 'text/event-stream' },
    });
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/boom' })
  async boom() {
    throw new Error('stream controller boom');
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/headers' })
  async headers(@InjectContext() ctx: any) {
    ctx.responseHeaders.set('x-service-worker', 'on');
    return { ok: true };
  }
}
