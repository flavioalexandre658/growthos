"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import type { IDebugResult, IDebugErrorHint } from "@/interfaces/event.interface";

const schema = z.object({
  url: z.string().url(),
  organizationId: z.string().uuid(),
  orgSlug: z.string().optional(),
});

export async function debugUrl(input: z.infer<typeof schema>): Promise<IDebugResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);
  const slug = data.orgSlug ?? "";

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
      result.errors.push({
        message: `Página retornou HTTP ${response.status}`,
        suggestion: "Verifique se a URL está correta e se a página está acessível publicamente.",
      });
      return result;
    }

    result.pageAccessible = true;
    html = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    if (message.includes("abort")) {
      result.errors.push({
        message: "Timeout: a página demorou mais de 10 segundos para responder",
        suggestion: "Verifique se o servidor do site está funcionando e acessível externamente.",
      });
    } else {
      result.errors.push({
        message: `Não foi possível acessar a página: ${message}`,
        suggestion: "Confirme que a URL está correta, inclui o protocolo (https://) e é acessível publicamente.",
      });
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
      result.errors.push({
        message: "tracker.js não encontrado no HTML da página",
        suggestion: "Instale o snippet do tracker.js no <head> de todas as páginas do seu site.",
      });
    }
    return result;
  }

  result.trackerFound = true;
  result.scriptSrc = scriptSrc;

  if (!apiKeyValue) {
    result.errors.push({
      message: "Atributo data-key não encontrado no script do tracker.js",
      suggestion: "Adicione o atributo data-key com sua API key ao elemento <script> do tracker.js.",
      ...(slug ? { link: { label: "Ver API Keys", href: `/${slug}/settings` } } : {}),
    });
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
    result.errors.push({
      message: "API key não encontrada no sistema",
      suggestion: "Verifique se a API key no script corresponde a uma key criada nesta conta.",
      ...(slug ? { link: { label: "Ir para Configurações", href: `/${slug}/settings` } } : {}),
    });
    return result;
  }

  result.keyValid = true;

  if (keyRow.organizationId === data.organizationId) {
    result.keyBelongsToOrg = true;
  } else {
    result.errors.push({
      message: "Esta API key pertence a outra organização",
      suggestion: "Acesse Configurações → API Keys e copie a key correta desta organização.",
      ...(slug ? { link: { label: "Ir para Configurações", href: `/${slug}/settings` } } : {}),
    });
  }

  if (!keyRow.isActive) {
    result.keyExpired = true;
    result.errors.push({
      message: "A API key está inativa",
      suggestion: "Ative esta key em Configurações ou crie uma nova key ativa.",
      ...(slug ? { link: { label: "Gerenciar API Keys", href: `/${slug}/settings` } } : {}),
    });
  } else if (keyRow.expiresAt && keyRow.expiresAt < new Date()) {
    result.keyExpired = true;
    result.errors.push({
      message: `A API key expirou em ${keyRow.expiresAt.toLocaleDateString("pt-BR")}`,
      suggestion: "Crie uma nova API key sem data de expiração ou com data futura.",
      ...(slug ? { link: { label: "Criar nova key", href: `/${slug}/settings` } } : {}),
    });
  }

  if (result.keyBelongsToOrg && !result.keyExpired) {
    const isAsync = html.includes(`src="${scriptSrc}" async`) || html.includes("async");
    if (!isAsync) {
      result.warnings.push("Considere adicionar o atributo async no script para não bloquear o carregamento da página");
    }
  }

  return result;
}
