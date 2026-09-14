import pino, { type Logger } from 'pino';

export type { Logger };

export function createLogger(level = 'info'): Logger {
  const pretty = Boolean(process.stdout.isTTY);
  return pino({
    level,
    ...(pretty
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }
      : {}),
  });
}
