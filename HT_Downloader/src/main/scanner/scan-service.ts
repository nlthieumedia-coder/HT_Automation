import type { ScanResult } from '../../shared/types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { validatePublicUrl } from './url-validator';
import { deduplicateVideos, normalizeYtDlp } from './normalizer';
import { YtDlpAnalyzer } from './ytdlp-analyzer';
import { DirectScanner } from './direct-scanner';
import { isRedditUrl, normalizeRedditUrl } from './reddit';
import { RedditScanner } from './reddit-scanner';

export class ScanService {
  private readonly redditScanner: RedditScanner;
  constructor(private readonly analyzer: YtDlpAnalyzer, private readonly directScanner = new DirectScanner()) {
    this.redditScanner = new RedditScanner(directScanner);
  }
  async scanUrl(input: string): Promise<ScanResult> {
    const url = normalizeRedditUrl(validatePublicUrl(input)).toString();
    logger.info('SCAN_STARTED', { url });
    let pageTitle: string | undefined; let pageUrl = url; let videos = [] as ScanResult['videos']; let ytDlpError: AppError | undefined;
    try {
      const raw = await this.analyzer.analyze(url);
      logger.info('YTDLP_SCAN_COMPLETE');
      videos = normalizeYtDlp(raw, url); pageTitle = raw.title; pageUrl = raw.webpage_url ?? url;
    } catch (error) {
      if (error instanceof AppError && ['DRM_PROTECTED', 'LOGIN_REQUIRED'].includes(error.code)) throw error;
      if (error instanceof AppError) ytDlpError = error;
      logger.warn('YTDLP_SCAN_FALLBACK', { reason: error instanceof AppError ? error.code : 'unknown' });
    }
    if (!videos.length) {
      const direct = isRedditUrl(url) ? await this.redditScanner.scan(url) : await this.directScanner.scan(url);
      videos = direct.videos; pageTitle = direct.title;
    }
    videos = deduplicateVideos(videos);
    if (!videos.length) { if (ytDlpError?.code === 'YTDLP_MISSING') throw ytDlpError; throw new AppError('NO_VIDEO', 'No video was detected on this page.'); }
    logger.info('MEDIA_FOUND', { count: videos.length });
    return { pageUrl, pageTitle, videos };
  }
}
