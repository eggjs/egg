#! /usr/bin/env bash

REPO=$(git config --get remote.origin.url | sed 's/git@\(.*\):\(.*\)\.git/http:\/\/\1\/\2/g')
LAST_TAG=$(git describe --tags --abbrev=0)
LAST_TAG_DATE=$(git show -s --format=%cd $LAST_TAG)
FORMAT="  * [[\`%h\`]($REPO/commit/%H)] - %s (%aN <<%ae>>)"

git fetch
git log --pretty=format:"$FORMAT" --since="$LAST_TAG_DATE" --no-merges
