import { access, copyFile, mkdir, rename, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export function sanitizeFilename(value: string): string {
  const cleaned = value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/[. ]+$/g, '').trim();
  return (cleaned || 'video').slice(0, 150);
}
async function exists(file: string): Promise<boolean> { try { await access(file); return true; } catch { return false; } }

export async function moveWithoutOverwrite(source: string, outputDirectory: string, title: string): Promise<string> {
  await mkdir(outputDirectory, { recursive: true });
  const extension = path.extname(source) || '.mp4'; const base = sanitizeFilename(title);
  let destination = path.join(outputDirectory, `${base}${extension}`); let suffix = 2;
  while (await exists(destination)) destination = path.join(outputDirectory, `${base} (${suffix++})${extension}`);
  try {
    await rename(source, destination);
  } catch (error) {
    // Windows rename cannot cross drive/volume boundaries (for example from
    // %TEMP% on C: to a user-selected folder on D:). Copy exclusively and only
    // remove the temporary source after the copy succeeds.
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EXDEV') throw error;
    await copyFile(source, destination, constants.COPYFILE_EXCL);
    await unlink(source);
  }
  return destination;
}
