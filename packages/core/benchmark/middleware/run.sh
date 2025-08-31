#!/usr/bin/env bash

echo
node -v
node `dirname $0`/start.js $1 &
pid=$!

sleep 3
echo "------- async middleware -------"
curl 'http://127.0.0.1:7001/async'
echo ""
wrk 'http://127.0.0.1:7001/async' \
  -d 10 \
  -c 50 \
  -t 8

kill $pid
