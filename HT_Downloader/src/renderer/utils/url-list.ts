export function parseUrlLines(input: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const line of input.split(/\r?\n/)) {
    const url = line.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}
