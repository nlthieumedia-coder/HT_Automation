import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from '../src/main/downloader/file-utils';
import { moveWithoutOverwrite } from '../src/main/downloader/file-utils';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
describe('Windows filename sanitation', () => {
  it('removes invalid and trailing characters', () => expect(sanitizeFilename('A <bad>: video?. ')).toBe('A bad video'));
  it('provides a safe fallback', () => expect(sanitizeFilename('???')).toBe('video'));
  it('moves an ASCII temporary file to a Vietnamese final filename', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'ht-file-test-'));
    try {
      const source = path.join(root, 'media.mp4'); const output = path.join(root, 'output');
      await writeFile(source, 'video');
      const destination = await moveWithoutOverwrite(source, output, 'Hồ nghẽn dòng hình thành sau lũ quét ở Nepal');
      expect(path.basename(destination)).toBe('Hồ nghẽn dòng hình thành sau lũ quét ở Nepal.mp4');
      expect(await readFile(destination, 'utf8')).toBe('video');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('moves a file from the system temp drive to the workspace drive', async () => {
    const sourceRoot = await mkdtemp(path.join(tmpdir(), 'ht-cross-drive-'));
    const outputRoot = await mkdtemp(path.join(process.cwd(), '.ht-output-test-'));
    try {
      const source = path.join(sourceRoot, 'media.mp4'); await writeFile(source, 'cross-volume video');
      const destination = await moveWithoutOverwrite(source, outputRoot, 'Video thử nghiệm');
      expect(await readFile(destination, 'utf8')).toBe('cross-volume video');
    } finally { await rm(sourceRoot, { recursive: true, force: true }); await rm(outputRoot, { recursive: true, force: true }); }
  });
});
