# Benchmark

## Results

- node: 4.5.0
- alinode: 1.6.0
- koa: 1.2.2
- toa: 1.8.1
- egg: 0.2.0

Scene | QPS | Avg RT (ms) | Stdev RT | Max RT
---   | --- | ---         | ---      | ---
egg Hello World | 8485 | 5.73 | 2.77 | 63.12
koa Hello World | 11852 | 4.23 | 2.99 | 84.56
toa Hello World | 12169 | 4.22 | 2.59 | 39.82
egg nunjucks | 6534 | 7.49 | 4.15 | 96.07
koa nunjucks | 9702 | 5.34 | 5.52 | 145.75
toa nunjucks | 9420 | 5.32 | 2.84 | 52.41

## Scenes

- Hello World: `$ EGG_SERVER_ENV=prod node benchmarks/simple/dispatch.js`
- nunjucks: `$ EGG_SERVER_ENV=prod node benchmarks/simple_view/dispatch.js`

## Scripts

- koa: `wrk http://remote-ip:7002/ -d 10 -c 50 -t 8`
- toa: `wrk http://remote-ip:7003/ -d 10 -c 50 -t 8`
- egg: `wrk http://remote-ip:7001/ -d 10 -c 50 -t 8`

## Server

- CPU x4: Intel(R) Xeon(R) CPU E5-2630 0 @ 2.30GHz
- Mem: 10G

## Details

### Hello World

- koa

```bash
wrk http://10.209.84.139:7002/ -d 10 -c 50 -t 8
Running 10s test @ http://10.209.84.139:7002/
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     4.23ms    2.99ms  84.56ms   94.80%
    Req/Sec     1.50k   278.02     2.65k    77.36%
  119711 requests in 10.10s, 17.92MB read
Requests/sec:  11852.36
Transfer/sec:      1.77MB
```

- toa

```bash
wrk http://10.209.84.139:7003/ -d 10 -c 50 -t 8
Running 10s test @ http://10.209.84.139:7003/
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     4.22ms    2.59ms  39.82ms   92.84%
    Req/Sec     1.54k   181.11     2.83k    77.09%
  122898 requests in 10.10s, 20.63MB read
Requests/sec:  12169.05
```

- egg

```bash
wrk http://10.209.84.139:7001/ -d 10 -c 50 -t 8
Running 10s test @ http://10.209.84.139:7001/
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     5.73ms    2.77ms  63.12ms   84.02%
    Req/Sec     1.07k   205.02     2.04k    69.40%
  85700 requests in 10.10s, 24.11MB read
Requests/sec:   8485.16
Transfer/sec:      2.39MB
```

### nunjucks

- koa

```bash
wrk http://10.209.84.139:7002/ -d 10 -c 50 -t 8
Running 10s test @ http://10.209.84.139:7002/
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     5.34ms    5.52ms 145.75ms   98.23%
    Req/Sec     1.23k   239.23     2.48k    82.69%
  97999 requests in 10.10s, 244.96MB read
Requests/sec:   9702.78
Transfer/sec:     24.25MB
```

- toa

```bash
wrk http://10.209.84.139:7003/ -d 10 -c 50 -t 8
Running 10s test @ http://10.209.84.139:7003/
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     5.32ms    2.84ms  52.41ms   92.35%
    Req/Sec     1.19k   134.30     2.73k    82.92%
  95139 requests in 10.10s, 239.53MB read
Requests/sec:   9420.63
Transfer/sec:     23.72MB
```

- egg

```bash
wrk http://10.209.84.139:7001/ -d 10 -c 50 -t 8
Running 10s test @ http://10.209.84.139:7001/
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     7.49ms    4.15ms  96.07ms   89.68%
    Req/Sec   824.74    175.90     1.75k    67.79%
  65988 requests in 10.10s, 173.63MB read
Requests/sec:   6534.15
Transfer/sec:     17.19MB
```
