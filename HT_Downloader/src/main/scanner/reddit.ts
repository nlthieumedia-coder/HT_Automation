const REDDIT_HOSTS = new Set([
  'reddit.com',
  'www.reddit.com',
  'old.reddit.com',
  'new.reddit.com',
  'np.reddit.com',
  'm.reddit.com',
  'amp.reddit.com',
  'redd.it',
  'www.redd.it',
  'v.redd.it'
]);

export function isRedditUrl(value: string | URL): boolean {
  try {
    const url = typeof value === 'string' ? new URL(value) : value;
    return REDDIT_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Reddit exposes the same post through several legacy/mobile hosts. Converting
 * post pages to the canonical host makes yt-dlp extraction more predictable;
 * short links and direct v.redd.it media must remain untouched.
 */
export function normalizeRedditUrl(url: URL): URL {
  const normalized = new URL(url);
  const host = normalized.hostname.toLowerCase();
  if (!isRedditUrl(normalized) || host === 'redd.it' || host === 'www.redd.it' || host === 'v.redd.it') return normalized;

  normalized.hostname = 'reddit.com';
  normalized.pathname = normalized.pathname.replace(/\/amp\/?$/i, '/');
  return normalized;
}

export function redditYtDlpArgs(value: string | URL): string[] {
  if (!isRedditUrl(value)) return [];
  // Some Reddit and v.redd.it endpoints reject requests without browser-like
  // request metadata. These options apply both while inspecting and downloading.
  return [
    '--referer', 'https://reddit.com/',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'
  ];
}
