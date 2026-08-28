import { describe, expect, it } from 'vitest';
import { normalizeYtDlp } from '../src/main/scanner/normalizer';

describe('yt-dlp normalizer', () => {
  it('groups multiple qualities into one video and hides audio-only formats', () => {
    const videos = normalizeYtDlp({ id: 'abc', title: 'Demo', formats: [
      { format_id: '140', acodec: 'aac', vcodec: 'none', ext: 'm4a' },
      { format_id: '22', height: 720, fps: 30, acodec: 'aac', vcodec: 'h264', ext: 'mp4' },
      { format_id: '137', height: 1080, fps: 60, acodec: 'none', vcodec: 'h264', ext: 'mp4' }
    ] }, 'https://example.com/video');
    expect(videos).toHaveLength(1);
    expect(videos[0].formats.map(item => item.qualityLabel)).toEqual(['1080p • 60 FPS', '720p']);
  });

  it('supports playlist entries without creating one item per format', () => {
    const videos = normalizeYtDlp({ title: 'Playlist', entries: [
      { id: 'one', title: 'One', formats: [{ format_id: '1', height: 480, vcodec: 'h264', acodec: 'aac' }] },
      { id: 'two', title: 'Two', formats: [{ format_id: '2', height: 720, vcodec: 'h264', acodec: 'none' }] }
    ] }, 'https://example.com/list');
    expect(videos.map(item => item.title)).toEqual(['One', 'Two']);
  });
});
