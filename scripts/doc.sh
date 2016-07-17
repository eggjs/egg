#! /usr/bin/env bash

export PATH=./node_modules/.bin:$PATH

cp README.md CONTRIBUTING.md docs/

echo "Building Gitbook"
gitbook build ./docs -o _site || exit $?

echo "Building Jsdoc"
doc -d ./_site/api --verbose || exit $?

echo "Copying thumb"
cp docs/logo/thumb.png _site || exit $?
