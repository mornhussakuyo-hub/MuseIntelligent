import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDesktopConfig } from '../desktop/config.mjs';

test('desktop reads the adjacent TXT key, tolerates BOM/newlines, and supports offline use', () => {
  const directory = mkdtempSync(join(tmpdir(), 'muse-desktop-'));
  try {
    assert.equal(readDesktopConfig(directory), null);
    writeFileSync(join(directory, 'API密钥.txt'), '\ufeffexample-test-key\r\n');
    const config = readDesktopConfig(directory);
    assert.equal(config.key, 'example-test-key');
    assert.equal(config.url, 'https://api.deepseek.com');
    assert.equal(config.model, 'deepseek-flash');
    assert.equal(config.visionModel, 'deepseek-flash');
    writeFileSync(join(directory, 'API密钥.txt'), ' \r\n');
    assert.equal(readDesktopConfig(directory), null);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
