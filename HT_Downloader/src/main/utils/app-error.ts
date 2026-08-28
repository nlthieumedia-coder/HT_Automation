import type { AppErrorCode, SerializedAppError } from '../../shared/types';

export class AppError extends Error {
  constructor(public readonly code: AppErrorCode, message: string, public readonly details?: string) {
    super(message);
    this.name = 'AppError';
  }

  serialize(): SerializedAppError { return { code: this.code, message: this.message, details: this.details }; }
}

export function serializeError(error: unknown): SerializedAppError {
  if (error instanceof AppError) return error.serialize();
  return { code: 'SCAN_FAILED', message: 'The page could not be scanned.', details: error instanceof Error ? error.message : String(error) };
}
