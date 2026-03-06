"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { passwordRecoveryEmail } from "@/lib/email-templates/password-recovery";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

export async function requestPasswordReset(input: z.infer<typeof schema>) {
  const data = schema.parse(input);

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (!user) return { success: true };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResets).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Redefinição de senha — Groware",
    html: passwordRecoveryEmail({
      userName: user.name,
      resetUrl,
      expiresInMinutes: 60,
    }),
  });

  return { success: true };
}
