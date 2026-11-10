import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { providerConfig } from '../server/guide.mjs';

export function readDesktopConfig(directory) {
  let key;
  try { key = readFileSync(join(directory, 'API密钥.txt'), 'utf8').trim(); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  return providerConfig({
    AI_API_KEY: key,
    AI_BASE_URL: 'https://api.deepseek.com',
    AI_MODEL: 'deepseek-flash',
    AI_VISION_MODEL: 'deepseek-flash',
  });
}
