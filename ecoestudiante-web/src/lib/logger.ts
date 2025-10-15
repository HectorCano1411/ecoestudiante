// src/lib/logger.ts
type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Cliente: NEXT_PUBLIC_LOG_LEVEL (por defecto 'info')
// Servidor: LOG_LEVEL (por defecto 'info')
const isServer = typeof window === 'undefined';
const rawLevel = isServer
  ? process.env.LOG_LEVEL
  : (typeof window !== 'undefined' && (window as any).__LOG_LEVEL__) || process.env.NEXT_PUBLIC_LOG_LEVEL;

const currentLevel: Level =
  (['debug', 'info', 'warn', 'error'].includes(String(rawLevel)) ? (rawLevel as Level) : 'info');

function log(level: Level, ns: string, ...args: any[]) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return;
  const prefix = `[${isServer ? 'server' : 'client'}][${ns}]`;
  // asigna la función de consola correcta
  const fn = level === 'error' ? console.error
    : level === 'warn' ? console.warn
    : level === 'debug' ? console.debug
    : console.log;
  fn(prefix, ...args);
}

export const logger = {
  debug: (ns: string, ...args: any[]) => log('debug', ns, ...args),
  info:  (ns: string, ...args: any[]) => log('info',  ns, ...args),
  warn:  (ns: string, ...args: any[]) => log('warn',  ns, ...args),
  error: (ns: string, ...args: any[]) => log('error', ns, ...args),
};
