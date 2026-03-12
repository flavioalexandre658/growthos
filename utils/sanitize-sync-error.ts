const SQL_PATTERNS = [
  /^Failed query:/i,
  /insert into\s+"/i,
  /select\s+.+from\s+"/i,
  /update\s+"/i,
  /delete\s+from\s+"/i,
  /on conflict/i,
  /do update set/i,
  /params:\s+/i,
];

const GENERIC_ERROR = "Erro interno ao processar dados. Tente novamente ou entre em contato com o suporte.";

export function sanitizeSyncError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (SQL_PATTERNS.some((p) => p.test(msg))) {
    return GENERIC_ERROR;
  }
  return msg;
}
