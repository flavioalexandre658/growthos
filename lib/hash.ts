import { createHash } from "crypto";

function getSalt(): string {
  const salt = process.env.CUSTOMER_HASH_SALT;
  if (!salt) throw new Error("CUSTOMER_HASH_SALT env var is not set");
  return salt;
}

export function hashAnonymous(id: string): string {
  return createHash("sha256")
    .update(id + getSalt())
    .digest("hex")
    .slice(0, 32);
}
