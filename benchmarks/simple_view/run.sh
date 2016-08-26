#!/usr/bin/env bash

echo
EGG_SERVER_ENV=prod node `dirname $0`/dispatch.js $1 &
pid=$!

sleep 3

curl 'http://127.0.0.1:7001/' | grep 'title'
echo ""
curl 'http://127.0.0.1:7002/' | grep 'title'
echo ""

echo "------- egg view -------"
wrk 'http://127.0.0.1:7001/' \
  -d 10 \
  -c 50 \
  -t 8

echo "------- koa view -------"
wrk 'http://127.0.0.1:7002/' \
  -d 10 \
  -c 50 \
  -t 8

kill $pid
