import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// Get all publishable packages from pnpm workspace

export function getPublishablePackages(baseDir) {
  const workspaceFile = path.join(baseDir, 'pnpm-workspace.yaml');

  if (!fs.existsSync(workspaceFile)) {
    throw new Error('pnpm-workspace.yaml not found');
  }

  const workspaceConfig = yaml.load(fs.readFileSync(workspaceFile, 'utf8'));
  const packages = workspaceConfig.packages || [];
  const publishablePackages = [];

  for (const packagePattern of packages) {
    // Handle glob patterns like 'packages/*', 'tools/*', etc.
    if (packagePattern.endsWith('/*')) {
      const dirPath = packagePattern.slice(0, -2); // Remove '/*'
      const fullDir = path.join(baseDir, dirPath);

      if (fs.existsSync(fullDir)) {
        const folders = fs.readdirSync(fullDir).filter(folder => fs.statSync(path.join(fullDir, folder)).isDirectory());

        for (const folder of folders) {
          const packageJsonPath = path.join(fullDir, folder, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            // Include packages that are not explicitly marked as private
            if (!packageJson.private) {
              publishablePackages.push({
                folder,
                directory: dirPath,
                name: packageJson.name,
                private: packageJson.private,
                version: packageJson.version,
              });
            }
          }
        }
      }
    } else {
      // Handle direct package paths like 'site'
      const packageJsonPath = path.join(baseDir, packagePattern, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (!packageJson.private) {
          publishablePackages.push({
            folder: path.basename(packagePattern),
            directory: path.dirname(packagePattern) || '.',
            name: packageJson.name,
            private: packageJson.private,
            version: packageJson.version,
          });
        }
      }
    }
  }

  return publishablePackages;
}
