"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import type { IDebugResult } from "@/interfaces/event.interface";

const schema = z.object({
  url: z.string().url(),
  organizationId: z.string().uuid(),
});

export async function debugUrl(input: z.infer<typeof schema>): Promise<IDebugResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const result: IDebugResult = {
    pageAccessible: false,
    httpStatus: null,
    trackerFound: false,
    scriptSrc: null,
    apiKeyFound: false,
    apiKeyValue: null,
    keyValid: false,
    keyBelongsToOrg: false,
    keyExpired: false,
    errors: [],
    warnings: [],
  };

  let html = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(data.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GrowthOS-Debugger/1.0",
      },
    });

    clearTimeout(timeout);
    result.httpStatus = response.status;

    if (!response.ok) {
      result.errors.push(`Página retornou HTTP ${response.status}`);
      return result;
    }

    result.pageAccessible = true;
    html = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    if (message.includes("abort")) {
      result.errors.push("Timeout: a página demorou mais de 10 segundos para responder");
    } else {
      result.errors.push(`Não foi possível acessar a página: ${message}`);
    }
    return result;
  }

  const scriptRegex = /<script[^>]+src=["']([^"']*tracker\.js[^"']*)["'][^>]*data-key=["']([^"']+)["'][^>]*>/gi;
  const scriptRegexAlt = /<script[^>]+data-key=["']([^"']+)["'][^>]+src=["']([^"']*tracker\.js[^"']*)["'][^>]*>/gi;

  let match = scriptRegex.exec(html);
  let scriptSrc: string | null = null;
  let apiKeyValue: string | null = null;

  if (match) {
    scriptSrc = match[1];
    apiKeyValue = match[2];
  } else {
    const altMatch = scriptRegexAlt.exec(html);
    if (altMatch) {
      apiKeyValue = altMatch[1];
      scriptSrc = altMatch[2];
    }
  }

  if (!scriptSrc && !apiKeyValue) {
    const genericTrackerMatch = html.match(/tracker\.js/i);
    if (genericTrackerMatch) {
      result.warnings.push("tracker.js encontrado no HTML mas sem data-key visível");
    } else {
      result.errors.push("tracker.js não encontrado no HTML da página");
    }
    return result;
  }

  result.trackerFound = true;
  result.scriptSrc = scriptSrc;

  if (!apiKeyValue) {
    result.errors.push("Atributo data-key não encontrado no script do tracker.js");
    return result;
  }

  result.apiKeyFound = true;
  result.apiKeyValue = apiKeyValue;

  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, apiKeyValue))
    .limit(1);

  if (!keyRow) {
    result.errors.push("API key não encontrada no sistema");
    return result;
  }

  result.keyValid = true;

  if (keyRow.organizationId === data.organizationId) {
    result.keyBelongsToOrg = true;
  } else {
    result.errors.push("Esta API key pertence a outra organização");
  }

  if (!keyRow.isActive) {
    result.keyExpired = true;
    result.errors.push("A API key está inativa");
  } else if (keyRow.expiresAt && keyRow.expiresAt < new Date()) {
    result.keyExpired = true;
    result.errors.push(`A API key expirou em ${keyRow.expiresAt.toLocaleDateString("pt-BR")}`);
  }

  if (result.keyBelongsToOrg && !result.keyExpired) {
    const isAsync = html.includes(`src="${scriptSrc}" async`) || html.includes("async");
    if (!isAsync) {
      result.warnings.push("Considere adicionar o atributo async no script para não bloquear o carregamento da página");
    }
  }

  return result;
}
