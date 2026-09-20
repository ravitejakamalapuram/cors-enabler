import type { LogLevel } from '@/engine/types';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Tiny structured logger. Debug output is suppressed unless developer mode is
 * enabled, keeping production builds quiet (spec §28/§32).
 */
export class Logger {
  private level: LogLevel = 'info';
  private developerMode = false;

  constructor(private readonly scope: string) {}

  configure(opts: { level?: LogLevel; developerMode?: boolean }): void {
    if (opts.level) this.level = opts.level;
    if (typeof opts.developerMode === 'boolean') this.developerMode = opts.developerMode;
  }

  child(scope: string): Logger {
    const l = new Logger(`${this.scope}:${scope}`);
    l.configure({ level: this.level, developerMode: this.developerMode });
    return l;
  }

  private enabled(level: LogLevel): boolean {
    if (level === 'debug' && !this.developerMode) return false;
    return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[this.level];
  }

  private emit(level: LogLevel, msg: string, data?: unknown): void {
    if (!this.enabled(level)) return;
    const prefix = `[${this.scope}]`;
    const args = data === undefined ? [prefix, msg] : [prefix, msg, data];
    (console[level] ?? console.log)(...args);
  }

  debug(msg: string, data?: unknown): void {
    this.emit('debug', msg, data);
  }
  info(msg: string, data?: unknown): void {
    this.emit('info', msg, data);
  }
  warn(msg: string, data?: unknown): void {
    this.emit('warn', msg, data);
  }
  error(msg: string, data?: unknown): void {
    this.emit('error', msg, data);
  }
}

export const rootLogger = new Logger('CORSEngine');
