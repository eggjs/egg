#! /usr/bin/env bash

export PATH=./node_modules/.bin:$PATH

copy_release() {
  echo -e "layout: release\n---\n" > tmp
  cat tmp History.md > docs/source/release/index.md || exit $?
  rm tmp
}

copy_files() {
  copy_release || exit $?
  cp CONTRIBUTING.md docs/source/contributing.md || exit $?
  cp CONTRIBUTING.zh-CN.md docs/source/zh-cn/contributing.md || exit $?
  cp MEMBER_GUIDE.md docs/source/member_guide.md || exit $?
}

server() {
  copy_files || exit $?
  hexo --cwd docs server -l
}

deploy() {
  copy_files || exit $?
  hexo --cwd docs generate --force || exit $?
}

action=$1

if [ $action = 'deploy' ]; then
  deploy
elif [ $action = 'server' ]; then
  server
fi
