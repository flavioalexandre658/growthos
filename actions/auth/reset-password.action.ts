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
  const data = schema.parse(input);

  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.token, data.token))
    .limit(1);

  if (!reset) throw new Error("Token inválido ou expirado.");
  if (reset.usedAt) throw new Error("Este link já foi utilizado.");
  if (reset.expiresAt < new Date()) throw new Error("Token expirado. Solicite um novo link.");

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
