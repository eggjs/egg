title: 生命周期
---

Egg提供了应用启动(`beforeStart`), 启动完成(`ready`), 关闭(`beforeClose`)这三个生命周期方法。
```
  init master process
           ⬇
   init agent process
           ⬇
loader.load | beforeStart
           ⬇
      await ready
           ⬇
   call ready callback
           ⬇
    init app processes
           ⬇
loader.load | beforeStart
           ⬇
      await ready
           ⬇
   call ready callback
```
## beforeStart
`beforeStart`由[`ready-callback`](https://www.npmjs.com/package/ready-callback)实现, 调用后将生产一个task存入缓存中, 传入的`scope`将在[`nextTick`](https://nodejs.org/dist/latest-v8.x/docs/api/process.html#process_process_nexttick_callback_args)调用, 调用完成后从缓存中删除task。当缓存中没有任务之后, 调用`ready()`注册的callback。
## ready
`ready`由[`get-ready`](https://www.npmjs.com/package/get-ready)实现, 注册的callback, 将在所有的`beforeStart`完成后调用。
## beforeClose
`beforeClose`注册方法至一个LIFO队列, 在app/agent实例的`close`方法被调用后, 按顺序执行。

e.g.:
```javascript
// app.js
console.time('app before start 200ms');
console.time('app before start 100ms');

app.beforeStart(async () => {
  await sleep(200);
  console.timeEnd('app before start 200ms');
});

app.beforeStart(async () => {
  await sleep(100);
  console.timeEnd('app before start 100ms');
  
});

app.on('server', () => {
  console.log('server is ready');
});

app.ready(() => {
  console.time('app ready 200ms');
  console.time('app ready 100ms');
})

app.ready(async () => {
  await sleep(200);
  console.timeEnd('app ready 200ms');
  cp.execSync(`kill ${process.ppid}`);
  console.time('app before close 200ms');
  console.time('app before close 100ms');
});

app.ready(async () => {
  await sleep(100);
  console.timeEnd('app ready 100ms');
});

app.beforeClose(async () => {
  await sleep(200);
  console.timeEnd('app before close 200ms');
});

app.beforeClose(async () => {
  await sleep(100);
  console.timeEnd('app before close 100ms');
});

// agent.js
console.time('agent before start 200ms');
console.time('agent before start 100ms');

agent.beforeStart(async () => {
  await sleep(200);
  console.timeEnd('agent before start 200ms');
});

agent.beforeStart(async () => {
  await sleep(100);
  console.timeEnd('agent before start 100ms');
});

agent.ready(() => {
  console.time('agent ready 200ms');
  console.time('agent ready 100ms');
})

agent.ready(async () => {
  await sleep(200);
  console.timeEnd('agent ready 200ms');
  console.time('agent before close 200ms');
  console.time('agent before close 100ms');
});

agent.ready(async () => {
  await sleep(100);
  console.timeEnd('agent ready 100ms');
});

agent.beforeClose(async () => {
  await sleep(200);
  console.timeEnd('agent before close 200ms');
});

agent.beforeClose(async () => {
  await sleep(100);
  console.timeEnd('agent before close 100ms');
});
```

print:
```
agent before start 100ms: 137.731ms
agent before start 200ms: 235.661ms // 并行执行

agent ready 100ms: 104.860ms
agent ready 200ms: 203.127ms // 并行执行

// 开流量
server is ready

// app在agent ready执行开始执行

app before start 100ms: 159.651ms
app before start 200ms: 259.245ms // 并行执行

app ready 100ms: 102.386ms
app ready 200ms: 203.347ms // 并行执行

agent before close 100ms: 930.251ms
app before close 100ms: 105.099ms // LIFO队列
app before close 200ms: 310.432ms // 顺序执行
agent before close 200ms: 1135.511ms
```
