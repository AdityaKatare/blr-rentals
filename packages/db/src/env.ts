import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

export function loadEnv(start: string = process.cwd()): string | null {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate)) {
      config({ path: candidate });
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
