#! /usr/bin/env bash

export PATH=./docs/node_modules/.bin:./node_modules/.bin:./scripts:$PATH

npm_install() {
  pushd docs > /dev/null
  [ -d node_modules ] || npminstall
  popd > /dev/null
}

import_ghpages() {
  echo "Pushing gh-pages"
  local message="Update documentation based on `git log -1 --pretty=%H`"
  ghp-import -p -m "$message" docs/public || exit $?
}

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
  npm_install || exit $?
  hexo --cwd docs server -l
}

deploy() {
  copy_files || exit $?
  npm_install || exit $?
  hexo --cwd docs generate --force || exit $?
  import_ghpages || exit $?
}

action=$1

if [ $action = 'deploy' ]; then
  deploy
elif [ $action = 'server' ]; then
  server
fi
