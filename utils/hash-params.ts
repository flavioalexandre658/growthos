import { createHash } from "crypto";

export function hashParams(params: unknown): string {
  const json = JSON.stringify(params ?? {});
  return createHash("md5").update(json).digest("hex").slice(0, 16);
}
