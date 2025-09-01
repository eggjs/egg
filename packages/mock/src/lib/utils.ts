import { rm } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scheduler } from 'node:timers/promises';

export function getSourceDirname() {
  if (typeof __dirname !== 'undefined') {
    return path.dirname(__dirname);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}

export async function sleep(delay: number) {
  await scheduler.wait(delay);
}

export async function rimraf(filepath: string) {
  await rm(filepath, { force: true, recursive: true });
}

export function rimrafSync(filepath: string) {
  rmSync(filepath, { force: true, recursive: true });
}

export function getProperty(target: any, prop: PropertyKey) {
  const member = target[prop];
  if (typeof member === 'function') {
    return member.bind(target);
  }
  return member;
}

export function getEggOptions() {
  const options = {
    baseDir: process.env.EGG_BASE_DIR ?? process.cwd(),
    framework: process.env.EGG_FRAMEWORK,
  };
  return options;
}

// const hasOwnProperty = Object.prototype.hasOwnProperty;

// /**
//  * Merge the property descriptors of `src` into `dest`
//  *
//  * @param {object} dest Object to add descriptors to
//  * @param {object} src Object to clone descriptors from
//  * @param {boolean} [redefine=true] Redefine `dest` properties with `src` properties
//  * @return {object} Reference to dest
//  * @public
//  */

// function merge(dest, src, redefine) {
//   if (!dest) {
//     throw new TypeError('argument dest is required');
//   }

//   if (!src) {
//     throw new TypeError('argument src is required');
//   }

//   if (redefine === undefined) {
//     // Default to true
//     redefine = true;
//   }

//   Object.getOwnPropertyNames(src).forEach(function forEachOwnPropertyName(name) {
//     if (!redefine && hasOwnProperty.call(dest, name)) {
//       // Skip descriptor
//       return;
//     }

//     // Copy descriptor
//     const descriptor = Object.getOwnPropertyDescriptor(src, name);
//     Object.defineProperty(dest, name, descriptor);
//   });

//   return dest;
// }
