import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [
      'test/fixtures/**',
      'examples/**/app/public/**',
      'logs/**',
      'run/**',
      'docs/node_modules/**',
      'site/**',
    ],
  },
  ...fixupConfigRules(compat.extends('eslint-config-egg')),
];
