"use server";

import { z } from "zod";
import { eq, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";

const schema = z.object({
  token: z.string().min(1, "Token inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação obrigatória"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export async function resetPassword(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "VALIDATION_ERROR" };
  const data = parsed.data;

  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.token, data.token))
    .limit(1);

  if (!reset) return { error: "INVALID_TOKEN" };
  if (reset.usedAt) return { error: "TOKEN_USED" };
  if (reset.expiresAt < new Date()) return { error: "TOKEN_EXPIRED" };

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, reset.userId));

  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(passwordResets.id, reset.id));

  return { success: true };
}
