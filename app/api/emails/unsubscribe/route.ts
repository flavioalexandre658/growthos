import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers } from "@/db/schema";

export const dynamic = "force-dynamic";
import { and, eq } from "drizzle-orm";
import dayjs from "dayjs";
import type { IEmailSequenceState } from "@/interfaces/email-sequence.interface";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const digestOnly = searchParams.get("digest") === "1";

  if (!token) {
    return new NextResponse("Token inválido", { status: 400 });
  }

  let userId: string;
  let organizationId: string;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [uid, orgId] = decoded.split(":");
    if (!uid || !orgId) throw new Error("malformed token");
    userId = uid;
    organizationId = orgId;
  } catch {
    return new NextResponse("Token inválido", { status: 400 });
  }

  const [member] = await db
    .select({ emailSequenceState: orgMembers.emailSequenceState })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!member) {
    return new NextResponse("Usuário não encontrado", { status: 404 });
  }

  const state = (member.emailSequenceState ?? {
    segment: "onboarding_incomplete",
    emailsSent: {},
    lastActivityAt: dayjs().toISOString(),
    digestEnabled: true,
    unsubscribedAt: null,
  }) as IEmailSequenceState;

  const updatedState: IEmailSequenceState = digestOnly
    ? { ...state, digestEnabled: false }
    : { ...state, unsubscribedAt: dayjs().toISOString() };

  await db
    .update(orgMembers)
    .set({ emailSequenceState: updatedState })
    .where(
      and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.organizationId, organizationId),
      ),
    );

  const message = digestOnly
    ? "Você foi removido do resumo semanal."
    : "Você foi removido de todas as sequências de email.";

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Descadastro — Groware</title>
  <style>
    body { background:#09090b; color:#a1a1aa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { background:#18181b; border:1px solid #27272a; border-radius:16px; padding:40px; max-width:400px; text-align:center; }
    h1 { color:#fafafa; font-size:20px; font-weight:700; margin:0 0 12px; }
    p { font-size:14px; line-height:1.7; margin:0; }
    a { color:#6366f1; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Tudo certo</h1>
    <p>${message}</p>
    <p style="margin-top:16px;"><a href="${process.env.NEXTAUTH_URL ?? "/"}">Voltar ao Groware</a></p>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
