#!/usr/bin/env bash

echo
npm start > output.log 2>&1 &
pid=$!

# print os and cpu info
echo "------- System info -------"
echo "OS: $(uname -mv)"
echo "CPU Model: $(node -p 'os.cpus()[0].model'), Speed: $(node -p 'os.cpus()[0].speed') MHz, Cores: $(node -p 'os.cpus().length')"
echo "Node.js: $(node --version)"
echo "Date: $(date)"

sleep 3

echo "\n------- tegg HttpController vs egg router Controller -------"
curl 'http://127.0.0.1:7001/hello-egg'
echo ""
curl 'http://127.0.0.1:7001/hello-tegg'
echo ""

echo "\n------- egg router Controller -------"
wrk 'http://127.0.0.1:7001/hello-egg' \
  -d 10 \
  -c 50 \
  -t 8

echo "\n------- tegg HttpController -------"
wrk 'http://127.0.0.1:7001/hello-tegg' \
  -d 10 \
  -c 50 \
  -t 8

npm stop
