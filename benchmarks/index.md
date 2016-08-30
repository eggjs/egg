# Benchmark

## Results

- koa: 1.2.2
- egg: 0.2.0

Scene | QPS | Avg RT (ms) | Stdev RT | Max RT
---   | --- | ---         | ---      | ---
koa Hello World | 11815 | 4.25 | 3.15 | 88.92
koa nunjucks | 9307 | 5.50 | 5.08 | 142.08
egg Hello World | 8655 | 5.57 | 2.44 | 54.97
egg nunjucks | 6553 | 7.42 | 3.72 | 89.80

## Scenes

- Hello World: `$ EGG_SERVER_ENV=prod node benchmarks/simple/dispatch.js`
- Hello nunjucks: `$ EGG_SERVER_ENV=prod node benchmarks/simple_view/dispatch.js`

## Scripts

- koa: `wrk http://remote-ip:7002/ -d 10 -c 50 -t 8`
- egg: `wrk http://remote-ip:7001/ -d 10 -c 50 -t 8`

## Server

- CPU x4: Intel(R) Xeon(R) CPU E5-2630 0 @ 2.30GHz
- Mem: 10G
