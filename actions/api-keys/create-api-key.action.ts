"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import dayjs from "dayjs";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  expiresDays: z.number().optional(),
});

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `tok_${result}`;
}

export async function createApiKey(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const expiresAt =
    data.expiresDays != null
      ? dayjs().add(data.expiresDays, "day").toDate()
      : null;

  return db
    .insert(apiKeys)
    .values({
      organizationId: data.organizationId,
      key: generateKey(),
      name: data.name,
      expiresAt,
    })
    .returning();
}
