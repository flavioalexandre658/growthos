import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function buildAnalysisPrompt(orgName: string, providerType: string, data: Record<string, unknown>): string {
  const context = providerType === "RIFAS"
    ? "empresa de rifas online (métricas: tickets vendidos, campanhas ativas, prêmios)"
    : "plataforma de convites digitais (métricas: cadastros, edições, pagamentos)";

  return `Você é um analista financeiro sênior especializado em crescimento digital analisando dados da ${orgName}, uma ${context}.

DADOS DO PERÍODO:
${JSON.stringify(data, null, 2)}

INSTRUÇÕES:
1. Analise onde o dinheiro está sendo perdido (maior gap entre receita e lucro real)
2. Identifique os custos que mais impactam a margem
3. Sugira 3-5 ações concretas e priorizadas para melhorar o lucro
4. Destaque oportunidades de receita que não estão sendo aproveitadas
5. Seja direto, use números e percentuais quando disponíveis
6. Formate a resposta em markdown com seções claras

Responda em português do Brasil.`;
}

function buildComparisonPrompt(
  orgName: string,
  providerType: string,
  section: string,
  periodALabel: string,
  periodBLabel: string,
  dataA: Record<string, unknown>,
  dataB: Record<string, unknown>
): string {
  const context = providerType === "RIFAS"
    ? "empresa de rifas online"
    : "plataforma de convites digitais";

  const sectionLabels: Record<string, string> = {
    overview: "Visão Geral",
    channels: "Canais de Aquisição",
    finance: "Financeiro",
    templates: "Templates",
    "landing-pages": "Landing Pages",
  };

  return `Você é um analista de growth sênior comparando períodos da ${orgName}, uma ${context}.

SEÇÃO ANALISADA: ${sectionLabels[section] ?? section}

PERÍODO A — ${periodALabel}:
${JSON.stringify(dataA, null, 2)}

PERÍODO B — ${periodBLabel}:
${JSON.stringify(dataB, null, 2)}

INSTRUÇÕES:
1. Compare os principais indicadores entre os dois períodos
2. Identifique o que melhorou e o que piorou (com % de variação)
3. Destaque as tendências mais relevantes
4. Aponte a causa provável das variações mais significativas
5. Sugira 2-3 ações baseadas nos dados comparados
6. Use tabelas markdown para comparativos numéricos quando adequado

Responda em português do Brasil.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, orgName, providerType } = body;

  let prompt: string;

  if (type === "comparison") {
    const { section, periodA, periodB } = body;
    prompt = buildComparisonPrompt(
      orgName ?? "sua empresa",
      providerType ?? "CONVITEDE",
      section,
      periodA.label,
      periodB.label,
      periodA.data,
      periodB.data
    );
  } else {
    prompt = buildAnalysisPrompt(
      orgName ?? "sua empresa",
      providerType ?? "CONVITEDE",
      body.data
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const stream = await model.generateContentStream(prompt);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream.stream) {
        const text = chunk.text();
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
