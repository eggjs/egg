import fs from 'node:fs/promises';

export class FSUtil {
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
    } catch {
      return false;
    }
    return true;
  }
}
