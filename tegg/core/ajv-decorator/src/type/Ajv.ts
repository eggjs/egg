import type { Schema } from 'ajv/dist/2019.js';

export interface Ajv {
  validate(schema: Schema, data: unknown): void;
}
