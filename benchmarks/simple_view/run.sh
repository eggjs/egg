#!/usr/bin/env bash

echo
EGG_SERVER_ENV=prod node `dirname $0`/dispatch.js $1 &
pid=$!

sleep 3
echo "------- egg view -------"
curl 'http://127.0.0.1:7001/' -s | grep 'title'
echo ""
wrk 'http://127.0.0.1:7001/' \
  -d 10 \
  -c 50 \
  -t 8

sleep 3
echo "------- koa view -------"
curl 'http://127.0.0.1:7002/' -s | grep 'title'
echo ""
wrk 'http://127.0.0.1:7002/' \
  -d 10 \
  -c 50 \
  -t 8

sleep 3
echo "------- toa view -------"
curl 'http://127.0.0.1:7003/' -s | grep 'title'
echo ""
wrk 'http://127.0.0.1:7003/' \
  -d 10 \
  -c 50 \
  -t 8
kill $pid
