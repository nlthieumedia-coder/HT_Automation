import { describe, expect, it } from 'vitest';
import { validatePublicUrl } from '../src/main/scanner/url-validator';
describe('URL validation', () => {
  it('accepts HTTPS', () => expect(validatePublicUrl('https://example.com/video').hostname).toBe('example.com'));
  it('rejects non-web and malformed inputs', () => { expect(() => validatePublicUrl('file:///C:/secret')).toThrow(); expect(() => validatePublicUrl('not a URL')).toThrow(); });
});
