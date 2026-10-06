@echo off

node --import @oxc-node/core/register "%~dp0\dev.js" %*
