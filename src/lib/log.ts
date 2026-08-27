type Meta = Record<string, unknown>;
function line(level: string, msg: string, meta?: Meta) {
  const rec = { t: new Date().toISOString(), level, msg, ...(meta ?? {}) };
  (level === 'error' ? process.stderr : process.stdout).write(JSON.stringify(rec) + '\n');
}
export const log = {
  info: (msg: string, meta?: Meta) => line('info', msg, meta),
  warn: (msg: string, meta?: Meta) => line('warn', msg, meta),
  error: (msg: string, meta?: Meta) => line('error', msg, meta),
};
