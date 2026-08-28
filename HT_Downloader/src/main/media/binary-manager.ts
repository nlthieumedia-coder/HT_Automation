import { access } from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import { AppError } from '../utils/app-error';

export type BinaryName = 'yt-dlp' | 'ffmpeg' | 'ffprobe';

export class BinaryManager {
  constructor(private readonly platform = process.platform, private readonly pathEnv = process.env.PATH ?? '') {}

  async resolve(name: BinaryName): Promise<string> {
    const executable = this.platform === 'win32' ? `${name}.exe` : name;
    const bundled = app.isPackaged
      ? path.join(process.resourcesPath, 'binaries', this.platform === 'win32' ? 'win' : this.platform, executable)
      : path.join(app.getAppPath(), 'resources', 'binaries', this.platform === 'win32' ? 'win' : this.platform, executable);
    if (await this.exists(bundled)) return bundled;

    for (const directory of this.pathEnv.split(path.delimiter).filter(Boolean)) {
      const candidate = path.join(directory.replace(/^"|"$/g, ''), executable);
      if (await this.exists(candidate)) return candidate;
    }
    const code = name === 'yt-dlp' ? 'YTDLP_MISSING' : 'SCAN_FAILED';
    throw new AppError(code, `${name} is not installed. Add it to resources/binaries or PATH.`);
  }

  private async exists(file: string): Promise<boolean> {
    try { await access(file); return true; } catch { return false; }
  }
}
