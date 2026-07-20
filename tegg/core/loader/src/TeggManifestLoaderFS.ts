import path from 'node:path';

import { ManifestLoaderFS, type LoaderFS, type LoaderFSManifestData } from '@eggjs/loader-fs';
import type { TeggManifest } from '@eggjs/tegg-types';

function normalizePath(filepath: string): string {
  return path.posix.normalize(filepath.replaceAll(path.sep, '/'));
}

/** Assert that the two manifest indexes agree on a module's identity. */
function validateTeggManifest(manifest: TeggManifest): void {
  if (!Array.isArray(manifest.moduleReferences) || !Array.isArray(manifest.moduleDescriptors)) {
    throw new Error('invalid tegg manifest: moduleReferences and moduleDescriptors must be arrays');
  }
  const descriptorMap = new Map<string, string>();
  for (const descriptor of manifest.moduleDescriptors) {
    const unitPath = normalizePath(descriptor.unitPath);
    if (descriptorMap.has(unitPath)) {
      throw new Error(`duplicate tegg manifest module descriptor path: ${descriptor.unitPath}`);
    }
    descriptorMap.set(unitPath, descriptor.name);
  }

  const referencePaths = new Set<string>();
  for (const reference of manifest.moduleReferences) {
    const unitPath = normalizePath(reference.path);
    if (referencePaths.has(unitPath)) {
      throw new Error(`duplicate tegg manifest module reference path: ${reference.path}`);
    }
    referencePaths.add(unitPath);
    const descriptorName = descriptorMap.get(unitPath);
    if (descriptorName !== undefined && descriptorName !== reference.name) {
      throw new Error(
        `tegg manifest module name mismatch at ${reference.path}: reference=${reference.name}, descriptor=${descriptorName}`,
      );
    }
  }
}

/** Create the virtual file view represented by a standalone tegg manifest. */
export function createTeggManifestLoaderFS(
  baseDir: string,
  manifest: TeggManifest,
  fallback?: LoaderFS,
): ManifestLoaderFS {
  validateTeggManifest(manifest);
  const fileDiscovery: LoaderFSManifestData['fileDiscovery'] = {};
  for (const descriptor of manifest.moduleDescriptors) {
    const unitPath = path.isAbsolute(descriptor.unitPath)
      ? descriptor.unitPath
      : path.resolve(baseDir, descriptor.unitPath);
    const relativeUnitPath = normalizePath(path.relative(baseDir, unitPath));
    fileDiscovery[relativeUnitPath === '.' ? '' : relativeUnitPath] = descriptor.decoratedFiles.map(normalizePath);
  }
  return new ManifestLoaderFS(
    {
      baseDir,
      data: {
        fileDiscovery,
        resolveCache: {},
      },
    },
    fallback,
  );
}
