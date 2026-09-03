import { describe, expect, it } from 'vitest';
import { isRedditUrl, normalizeRedditUrl, redditYtDlpArgs } from '../src/main/scanner/reddit';
import { extractRedditMediaUrl, redditEmbedUrl } from '../src/main/scanner/reddit-scanner';

describe('Reddit support', () => {
  it('recognizes Reddit post, short, and media URLs', () => {
    expect(isRedditUrl('https://www.reddit.com/r/videos/comments/abc/a_video/')).toBe(true);
    expect(isRedditUrl('https://redd.it/abc')).toBe(true);
    expect(isRedditUrl('https://v.redd.it/media-id/DASH_720.mp4')).toBe(true);
    expect(isRedditUrl('https://notreddit.com/video')).toBe(false);
  });

  it('canonicalizes legacy post hosts and AMP paths', () => {
    const result = normalizeRedditUrl(new URL('https://old.reddit.com/r/test/comments/abc/title/amp/?utm_source=share'));
    expect(result.hostname).toBe('reddit.com');
    expect(result.pathname).toBe('/r/test/comments/abc/title/');
    expect(result.searchParams.get('utm_source')).toBe('share');
  });

  it('builds an official embed URL and extracts hosted media', () => {
    const post = new URL('https://www.reddit.com/r/test/comments/abc/title/');
    expect(redditEmbedUrl(post)).toContain('https://www.redditmedia.com/r/test/comments/abc/title/');
    expect(extractRedditMediaUrl('&quot;url&quot;:&quot;https://v.redd.it/m9g78hn4a0nh1&quot;')).toBe('https://v.redd.it/m9g78hn4a0nh1');
  });

  it('preserves short and direct media hosts', () => {
    expect(normalizeRedditUrl(new URL('https://redd.it/abc')).toString()).toBe('https://redd.it/abc');
    expect(normalizeRedditUrl(new URL('https://v.redd.it/xyz/DASHPlaylist.mpd')).hostname).toBe('v.redd.it');
  });

  it('adds request metadata only for Reddit', () => {
    expect(redditYtDlpArgs('https://reddit.com/r/test/comments/abc/title')).toContain('--referer');
    expect(redditYtDlpArgs('https://example.com/video')).toEqual([]);
  });
});
