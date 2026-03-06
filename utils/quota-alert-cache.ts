type QuotaAlertLevel = "warning" | "exceeded";

const sentAlerts = new Set<string>();

function buildKey(userId: string, yearMonth: string, level: QuotaAlertLevel): string {
  return `${userId}:${yearMonth}:${level}`;
}

export function hasAlertBeenSent(
  userId: string,
  yearMonth: string,
  level: QuotaAlertLevel,
): boolean {
  return sentAlerts.has(buildKey(userId, yearMonth, level));
}

export function markAlertSent(
  userId: string,
  yearMonth: string,
  level: QuotaAlertLevel,
): void {
  sentAlerts.add(buildKey(userId, yearMonth, level));
}
