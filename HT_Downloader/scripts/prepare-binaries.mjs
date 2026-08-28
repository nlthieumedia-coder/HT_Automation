import { copyFileSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

if (process.platform !== 'win32') throw new Error('This V1 binary preparation script targets Windows.');
const destination = path.resolve('resources/binaries/win');
mkdirSync(destination, { recursive: true });
if (!ffmpegPath) throw new Error('ffmpeg-static did not provide a Windows binary.');
copyFileSync(ffmpegPath, path.join(destination, 'ffmpeg.exe'));
copyFileSync(ffprobeStatic.path, path.join(destination, 'ffprobe.exe'));
const response = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', { redirect: 'follow' });
if (!response.ok) throw new Error(`Could not download yt-dlp (${response.status}).`);
await writeFile(path.join(destination, 'yt-dlp.exe'), Buffer.from(await response.arrayBuffer()));
console.log('Prepared yt-dlp, FFmpeg, and FFprobe in resources/binaries/win.');
