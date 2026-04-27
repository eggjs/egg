import fs from 'node:fs';
import path from 'node:path';

export default class ManifestSkipCloseBoot {
  constructor(app) {
    this.app = app;
  }

  async loadMetadata() {
    const marker = path.join(this.app.baseDir, 'before-close-called');
    this.app.beforeClose(async () => {
      fs.writeFileSync(marker, 'called');
      throw new Error('beforeClose should not run during manifest generation');
    });
  }
}
