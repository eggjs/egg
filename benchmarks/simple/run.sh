#!/usr/bin/env bash

echo
EGG_SERVER_ENV=prod node dispatch.js $1 &
pid=$!

sleep 3

curl -v 'http://localhost:7001/'

wrk 'http://localhost:7001/' \
  -d 10 \
  -c 50 \
  -t 8
  # | grep 'Requests/sec' \
  # | awk '{ print "  " $2 }'

kill $pid
