import { AppError } from '../utils/app-error';

export function validatePublicUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new AppError('INVALID_URL', 'Enter a valid HTTP or HTTPS URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new AppError('INVALID_URL', 'Only HTTP and HTTPS URLs are supported.');
  if (url.username || url.password) throw new AppError('INVALID_URL', 'URLs containing credentials are not supported.');
  return url;
}
