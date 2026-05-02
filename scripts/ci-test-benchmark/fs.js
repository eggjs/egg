import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Failed to parse JSON report at ${filePath}: ${error.message}`);
    return null;
  }
}

export async function readTextIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }
  return readFile(filePath, 'utf8');
}

export async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeText(filePath, value) {
  await writeFile(filePath, value);
}
