# Benchmark

## Benchmark Result

```sh
v8.9.0
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     7.35ms    1.76ms  26.71ms   89.82%
    Req/Sec   835.10     90.14     1.00k    77.15%
  64366 requests in 10.00s, 47.37MB read
Requests/sec:   6436.48
Transfer/sec:      4.74MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     5.35ms    1.27ms  20.44ms   92.48%
    Req/Sec     1.18k   157.98     1.57k    75.69%
  90415 requests in 10.00s, 60.08MB read
Requests/sec:   9040.45
Transfer/sec:      6.01MB
```

![](https://user-images.githubusercontent.com/985607/32474444-2f4b7cde-c332-11e7-923f-8dfb709a7a24.png)

### 2022-12-06

Enable asyncLocalStorage

```bash
v18.12.1
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     2.42ms  584.46us  12.20ms   94.43%
    Req/Sec     2.50k   601.24    18.36k    97.63%
  198950 requests in 10.10s, 153.00MB read
Requests/sec:  19699.09
Transfer/sec:     15.15MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     1.97ms    1.58ms  43.26ms   96.10%
    Req/Sec     3.23k     0.86k   24.84k    95.38%
  257959 requests in 10.10s, 179.02MB read
Requests/sec:  25533.50
Transfer/sec:     17.72MB

v16.18.1
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     2.53ms    1.21ms  36.34ms   93.77%
    Req/Sec     2.44k   372.60     7.16k    91.78%
  194905 requests in 10.10s, 149.87MB read
Requests/sec:  19288.29
Transfer/sec:     14.83MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     1.76ms  405.33us  10.08ms   89.00%
    Req/Sec     3.43k   264.17     5.94k    85.09%
  275242 requests in 10.10s, 191.08MB read
Requests/sec:  27242.76
Transfer/sec:     18.91MB

v14.21.1
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     4.16ms    2.46ms  39.16ms   91.43%
    Req/Sec     1.55k   349.54     1.92k    84.88%
  123307 requests in 10.04s, 94.43MB read
Requests/sec:  12280.55
Transfer/sec:      9.40MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     2.88ms    1.38ms  24.43ms   93.97%
    Req/Sec     2.19k   283.92     2.94k    85.25%
  174192 requests in 10.01s, 120.54MB read
Requests/sec:  17395.81
Transfer/sec:     12.04MB

v12.22.12
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    11.04ms    9.39ms  75.99ms   91.60%
    Req/Sec   638.74    167.21     0.90k    63.25%
  50990 requests in 10.04s, 38.43MB read
Requests/sec:   5078.85
Transfer/sec:      3.83MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     7.45ms    7.68ms  69.86ms   93.04%
    Req/Sec     1.00k   195.80     1.26k    74.50%
  80059 requests in 10.03s, 54.83MB read
Requests/sec:   7981.39
Transfer/sec:      5.47MB
```

Disable asyncLocalStorage

```bash
v18.12.1
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     2.22ms    1.18ms  38.70ms   93.88%
    Req/Sec     2.79k   361.32     3.27k    85.50%
  222356 requests in 10.01s, 171.13MB read
Requests/sec:  22208.19
Transfer/sec:     17.09MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     1.71ms    0.98ms  33.63ms   94.19%
    Req/Sec     3.60k   511.38    10.65k    91.28%
  288119 requests in 10.10s, 200.07MB read
Requests/sec:  28513.37
Transfer/sec:     19.80MB

v8.17.0
server started at 7001
------- generator middleware -------
["generator middleware #1","generator middleware #2","generator middleware #3","generator middleware #4","generator middleware #5","generator middleware #6","generator middleware #7","generator middleware #8","generator middleware #9","generator middleware #10","generator middleware #11","generator middleware #12","generator middleware #13","generator middleware #14","generator middleware #15","generator middleware #16","generator middleware #17","generator middleware #18","generator middleware #19","generator middleware #20"]
Running 10s test @ http://127.0.0.1:7001/generator
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     4.10ms    2.11ms  29.73ms   93.47%
    Req/Sec     1.53k   241.05     3.74k    84.43%
  122526 requests in 10.11s, 91.14MB read
Requests/sec:  12123.93
Transfer/sec:      9.02MB
------- async middleware -------
["async middleware #1","async middleware #2","async middleware #3","async middleware #4","async middleware #5","async middleware #6","async middleware #7","async middleware #8","async middleware #9","async middleware #10","async middleware #11","async middleware #12","async middleware #13","async middleware #14","async middleware #15","async middleware #16","async middleware #17","async middleware #18","async middleware #19","async middleware #20"]
Running 10s test @ http://127.0.0.1:7001/async
  8 threads and 50 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     3.66ms    4.33ms  86.07ms   96.97%
    Req/Sec     1.89k   296.76     2.24k    86.50%
  151007 requests in 10.04s, 101.04MB read
Requests/sec:  15046.06
Transfer/sec:     10.07MB
```
