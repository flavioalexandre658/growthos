import { NextRequest } from "next/server";
import { getAiQueue } from "@/lib/queue";
import type { AiJobData } from "@/lib/queue";
import { cacheGet, aiResultCacheKey } from "@/lib/cache";
import { hashParams } from "@/utils/hash-params";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { getUserPlan } = await import("@/utils/get-user-plan");
  const plan = await getUserPlan();

  if (!plan.hasAiAnalysis) {
    return new Response(
      JSON.stringify({ error: "AI analysis is not available on the Free plan. Upgrade to Starter or above." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const {
    type = "analysis",
    orgName,
    providerType,
    language = "pt-BR",
    currency = "BRL",
    country = "BR",
    organizationId,
  } = body;

  const dataHash = hashParams(body.data);
  const cacheKey = aiResultCacheKey(organizationId ?? "unknown", type, dataHash);

  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const jobData: AiJobData = {
    type,
    orgName: orgName ?? "sua empresa",
    providerType,
    language,
    currency,
    country,
    data: body.data,
    cacheKey,
  };

  const queue = getAiQueue();
  const job = await queue.add(`ai-${type}`, jobData);

  return new Response(
    JSON.stringify({ jobId: job.id, status: "queued" }),
    { status: 202, headers: { "Content-Type": "application/json" } },
  );
}
