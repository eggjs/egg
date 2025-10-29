# tegg benchmark http

## Prepare

Install [wrk](https://github.com/wg/wrk) first:

```bash
brew install wrk
```

Install dependencies

```bash
npm install
```

## Run benchmark

```bash
npm run bench
```

## Benchmark Result

### Summary

| Controller Type       | Node.js Version | Egg.js Version | Requests/sec | Transfer/sec |
| --------------------- | --------------- | -------------- | ------------ | ------------ |
| egg router Controller | v24.10.0        | 4.1.0-beta.33  | 133392       | 49.23MB      |
| egg router Controller | v22.21.0        | 4.1.0-beta.33  | 100761       | 37.18MB      |
| egg router Controller | v20.19.5        | 4.1.0-beta.33  | 93121        | 34.36MB      |
| tegg HttpController   | v24.10.0        | 4.1.0-beta.33  | 128504       | 47.42MB      |
| tegg HttpController   | v22.21.0        | 4.1.0-beta.33  | 93810        | 34.61MB      |
| tegg HttpController   | v20.19.5        | 4.1.0-beta.33  | 86062        | 31.76MB      |

### 2025-10-29

```bash
------- System info -------
OS: Darwin Kernel Version 25.0.0: Wed Sep 17 21:41:26 PDT 2025; root:xnu-12377.1.9~141/RELEASE_ARM64_T6041 arm64
CPU Model: Apple M4 Max, Speed: 2400 MHz, Cores: 16
Node.js: v24.10.0
Date: Wed Oct 29 13:48:23 CST 2025

------- tegg HttpController vs egg router Controller -------
hello,  egg@4.1.0-beta.33
hello, tegg@4.1.0-beta.33

------- egg router Controller -------
Running 10s test @ http://127.0.0.1:7001/hello-egg
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   389.00us  365.01us  23.36ms   94.82%
    Req/Sec    16.76k     1.82k   19.84k    73.51%
  1347203 requests in 10.10s, 497.20MB read
Requests/sec: 133392.50
Transfer/sec:     49.23MB

------- tegg HttpController -------
Running 10s test @ http://127.0.0.1:7001/hello-tegg
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   389.92us  208.51us   4.81ms   89.76%
    Req/Sec    16.14k     1.24k   18.72k    68.32%
  1297855 requests in 10.10s, 478.95MB read
Requests/sec: 128504.43
Transfer/sec:     47.42MB

------- System info -------
OS: Darwin Kernel Version 25.0.0: Wed Sep 17 21:41:26 PDT 2025; root:xnu-12377.1.9~141/RELEASE_ARM64_T6041 arm64
CPU Model: Apple M4 Max, Speed: 2400 MHz, Cores: 16
Node.js: v22.21.0
Date: Wed Oct 29 13:41:52 CST 2025

------- tegg HttpController vs egg router Controller -------
hello,  egg@4.1.0-beta.33
hello, tegg@4.1.0-beta.33

------- egg router Controller -------
Running 10s test @ http://127.0.0.1:7001/hello-egg
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   492.14us  416.11us  24.06ms   96.67%
    Req/Sec    12.66k     1.64k   15.62k    74.50%
  1017693 requests in 10.10s, 375.49MB read
Requests/sec: 100761.07
Transfer/sec:     37.18MB

------- tegg HttpController -------
Running 10s test @ http://127.0.0.1:7001/hello-tegg
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   524.98us  320.62us  13.36ms   93.56%
    Req/Sec    11.78k     1.12k   13.65k    65.72%
  947462 requests in 10.10s, 349.60MB read
Requests/sec:  93810.11
Transfer/sec:     34.61MB
```

```bash
------- System info -------
OS: Darwin Kernel Version 25.0.0: Wed Sep 17 21:41:26 PDT 2025; root:xnu-12377.1.9~141/RELEASE_ARM64_T6041 arm64
CPU Model: Apple M4 Max, Speed: 2400 MHz, Cores: 16
Node.js: v20.19.5
Date: Wed Oct 29 13:44:01 CST 2025

------- tegg HttpController vs egg router Controller -------
hello,  egg@4.1.0-beta.33
hello, tegg@4.1.0-beta.33

------- egg router Controller -------
Running 10s test @ http://127.0.0.1:7001/hello-egg
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   531.45us  439.23us  24.57ms   96.61%
    Req/Sec    11.70k     1.35k   14.26k    71.53%
  940525 requests in 10.10s, 347.04MB read
Requests/sec:  93121.15
Transfer/sec:     34.36MB

------- tegg HttpController -------
Running 10s test @ http://127.0.0.1:7001/hello-tegg
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   559.66us  183.78us   5.79ms   85.83%
    Req/Sec    10.81k     0.87k   12.46k    69.06%
  869205 requests in 10.10s, 320.75MB read
Requests/sec:  86062.86
Transfer/sec:     31.76MB
```
