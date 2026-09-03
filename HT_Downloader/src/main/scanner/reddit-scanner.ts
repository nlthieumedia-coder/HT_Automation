import * as cheerio from 'cheerio';
import { spawn } from 'node:child_process';
import type { VideoItem } from '../../shared/types';
import { AppError } from '../utils/app-error';
import { DirectScanner } from './direct-scanner';

export class RedditScanner {
  constructor(private readonly directScanner: DirectScanner) {}

  async scan(postUrl: string): Promise<{ title?: string; videos: VideoItem[] }> {
    const embedUrl = redditEmbedUrl(new URL(postUrl));
    // Reddit currently rejects Node/Electron's TLS fingerprint with HTTP 403,
    // while the Windows HTTP client is accepted. curl.exe ships with supported
    // Windows versions and lets this fallback work without a proxy or login.
    const html = await fetchEmbedWithCurl(embedUrl);
    const mediaUrl = extractRedditMediaUrl(html);
    if (!mediaUrl) throw new AppError('NO_VIDEO', 'This Reddit post does not contain a downloadable hosted video.');
    const $ = cheerio.load(html);
    const title = $('meta[property="og:title"]').attr('content')?.trim()
      || $('title').first().text().replace(/\s*:\s*[^:]+$/, '').trim()
      || 'Reddit video';
    const thumbnail = $('meta[property="og:image"]').attr('content');
    const manifestUrl = `${mediaUrl.replace(/\/$/, '')}/DASHPlaylist.mpd`;
    return { title, videos: [await this.directScanner.scanMediaUrl(manifestUrl, title, thumbnail)] };
  }
}

function fetchEmbedWithCurl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('curl.exe', ['--fail', '--silent', '--show-error', '--location', '--max-time', '20', '--max-filesize', '5000000', '--user-agent', 'Mozilla/5.0 HT-Downloader/1.0', '--', url], {
      windowsHide: true,
      shell: false
    });
    const stdout: Buffer[] = []; const stderr: Buffer[] = []; let size = 0; let settled = false;
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > 5_000_000) child.kill();
      else stdout.push(Buffer.from(chunk));
    });
    child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));
    child.once('error', error => reject(new AppError('NETWORK_ERROR', 'Could not start the Windows HTTP client.', error.message)));
    child.once('close', code => {
      if (settled) return; settled = true;
      const details = Buffer.concat(stderr).toString('utf8').trim();
      if (size > 5_000_000) return reject(new AppError('PAGE_INACCESSIBLE', 'The Reddit embed response is too large.'));
      if (code !== 0) return reject(new AppError('PAGE_INACCESSIBLE', 'Could not access the Reddit embed page.', details));
      resolve(Buffer.concat(stdout).toString('utf8'));
    });
  });
}

export function redditEmbedUrl(postUrl: URL): string {
  return new URL(`${postUrl.pathname}?ref_source=embed&ref=share&embed=true`, 'https://www.redditmedia.com').toString();
}

export function extractRedditMediaUrl(html: string): string | undefined {
  const decoded = html.replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  return decoded.match(/https:\/\/v\.redd\.it\/[a-z0-9]+/i)?.[0];
}
