#!/usr/bin/env node

function presetWindowsShell() {
  if (process.platform !== 'win32' || process.env.SHELL) return;

  const comspec = process.env.ComSpec ?? process.env.COMSPEC;
  process.env.SHELL = comspec?.split(/[\\/]/).at(-1) || 'cmd.exe';
}

presetWindowsShell();
const { execute } = await import('@oclif/core');

await execute({ dir: import.meta.url });
