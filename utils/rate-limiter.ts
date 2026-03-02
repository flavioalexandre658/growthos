const WINDOW_MS = 60_000;
const MAX_REQUESTS = 1000;

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now > entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= MAX_REQUESTS;
}
