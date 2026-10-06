import { createWorkerThreadIO } from '../../src/worker_protocol/worker-thread.ts';

const io = createWorkerThreadIO();

io.on('message', (message) => {
  if (message === 'kill') {
    io.kill();
  }
});

io.send({ action: 'ready' });
