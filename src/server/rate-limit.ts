const WINDOW_MS = 60_000;
const MAX_WRITES = 40;

const globalForLimit = globalThis as unknown as { __writeLog?: Map<string, number[]> };

/**
 * Allows a visitor 40 writes a minute. The log lives in the memory of one server instance, which is
 * enough to stop a script from filling a demo database; it is not a security boundary.
 */
export function allowWrite(sessionId: string, now = Date.now()): boolean {
  const log = (globalForLimit.__writeLog ??= new Map<string, number[]>());
  const recent = (log.get(sessionId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_WRITES) {
    log.set(sessionId, recent);
    return false;
  }
  recent.push(now);
  log.set(sessionId, recent);
  // Idle visitors would otherwise stay in the map for the life of the instance.
  if (log.size > 5_000) {
    for (const [key, times] of log) if (times.every((at) => now - at >= WINDOW_MS)) log.delete(key);
  }
  return true;
}
