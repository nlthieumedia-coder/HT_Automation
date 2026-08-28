type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
const sensitive = /(authorization|cookie|token|password)(["'\s:=]+)([^\s,"'}]+)/gi;

function write(level: Level, event: string, metadata?: Record<string, unknown>): void {
  const suffix = metadata ? ` ${JSON.stringify(metadata).replace(sensitive, '$1$2[REDACTED]')}` : '';
  const line = `${new Date().toISOString()} ${level} ${event}${suffix}`;
  if (level === 'ERROR') console.error(line); else if (level === 'WARN') console.warn(line); else if (level === 'DEBUG') console.debug(line); else console.info(line);
}

export const logger = {
  info: (event: string, metadata?: Record<string, unknown>) => write('INFO', event, metadata),
  warn: (event: string, metadata?: Record<string, unknown>) => write('WARN', event, metadata),
  error: (event: string, metadata?: Record<string, unknown>) => write('ERROR', event, metadata),
  debug: (event: string, metadata?: Record<string, unknown>) => write('DEBUG', event, metadata)
};
