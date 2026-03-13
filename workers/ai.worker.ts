import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Job } from "bullmq";
import type { AiJobData } from "@/lib/queue";
import { cacheGet, cacheSet } from "@/lib/cache";

const ANALYSIS_JSON_SCHEMA = `{
  "score": number (0-100),
  "scoreLabel": string (ex: "Crítico", "Atenção", "Bom", "Excelente"),
  "summary": string (1-2 frases resumindo a saúde do negócio e o principal insight),
  "findings": [
    {
      "severity": "critical" | "warning" | "good",
      "title": string,
      "metric": string (valor numérico com unidade, ex: "69%", "R$ 405,00"),
      "description": string (1-2 frases explicando o que esse dado significa)
    }
  ],
  "diagnoses": [
    {
      "title": string,
      "severity": "critical" | "warning" | "info",
      "content": string (2-4 frases detalhadas sobre esse diagnóstico)
    }
  ],
  "actions": [
    {
      "priority": number (1 = mais urgente),
      "title": string,
      "description": string,
      "impact": string (ex: "+R$ 200/mês", "+15% margem"),
      "roi": "alto" | "medio" | "baixo"
    }
  ]
}`;

const COMPARISON_JSON_SCHEMA = `{
  "score": number (0-100, avalia a saúde comparativa — 100 = crescimento forte e saudável),
  "scoreLabel": string ("Excelente" | "Bom" | "Atenção" | "Crítico"),
  "resumo": string (máximo 2 frases — o que mais importa na comparação),
  "veredicto": "crescimento" | "estabilidade" | "declinio" | "anomalia",
  "achados": [
    {
      "titulo": string,
      "severidade": "positivo" | "atencao" | "critico",
      "metrica": string (nome da métrica analisada),
      "valor_a": string (valor do período A já formatado),
      "valor_b": string (valor do período B já formatado),
      "variacao": string (variação já calculada, ex: "+2.776%"),
      "interpretacao": string (1 frase explicando o significado da variação)
    }
  ],
  "diagnostico": string (2-3 parágrafos separados por \\n\\n explicando causa raiz das variações),
  "plano": [
    {
      "prioridade": number (1 = mais urgente),
      "titulo": string,
      "acao": string (ação específica e concreta),
      "impacto_estimado": string (ex: "+R$ 200/mês", "+15% conversão"),
      "prazo": "imediato" | "esta_semana" | "este_mes"
    }
  ]
}`;

const LANGUAGE_LABELS: Record<string, string> = {
  "pt-BR": "português do Brasil",
  "pt-PT": "português europeu",
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  "es-ES": "español",
  "fr-FR": "français",
  "de-DE": "Deutsch",
};

function getLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? LANGUAGE_LABELS["pt-BR"];
}

function buildAnalysisPrompt(
  orgName: string,
  providerType: string,
  data: Record<string, unknown>,
  language: string,
  currency: string,
  country: string,
): string {
  const languageLabel = getLanguageLabel(language);
  const context =
    providerType === "RIFAS"
      ? "empresa de rifas online (métricas: tickets vendidos, campanhas ativas, prêmios)"
      : "plataforma de convites digitais (métricas: cadastros, edições, pagamentos)";

  return `Você é um analista financeiro sênior especializado em crescimento digital analisando dados da ${orgName}, uma ${context}.

CONTEXTO DA ORGANIZAÇÃO:
- País: ${country}
- Moeda base: ${currency}
- Responder em: ${languageLabel}

DADOS DO PERÍODO:
${JSON.stringify(data, null, 2)}

INSTRUÇÕES:
1. Calcule um score de saúde do negócio de 0-100 baseado em margem, funil de conversão, ticket médio e oportunidades perdidas
2. Identifique findings (achados) classificados como critical/warning/good — mínimo 1 de cada categoria se os dados permitirem
3. Produza diagnósticos temáticos detalhados (perda de capital, eficiência operacional, oportunidades)
4. Gere 3-5 ações concretas e priorizadas com impacto estimado em receita/margem
5. Seja direto e use números reais dos dados quando disponíveis
6. Se houver dados do período anterior, compare e inclua % de variação no diagnóstico
7. Valores monetários estão em ${currency} — use o símbolo correto desta moeda ao citar valores

RESPONDA EXCLUSIVAMENTE EM JSON válido seguindo este schema exato:
${ANALYSIS_JSON_SCHEMA}

IMPORTANTE: Responda em ${languageLabel}. Não inclua nenhum texto fora do JSON.`;
}

function buildComparisonPrompt(
  orgName: string,
  data: Record<string, unknown>,
  language: string,
  currency: string,
): string {
  const languageLabel = getLanguageLabel(language);

  return `Você é o Analista de Growth Sênior da ${orgName}.

CONTEXTO: Moeda base ${currency}. Responder em ${languageLabel}.

DADOS COMPARATIVOS (valores na moeda base ${currency}, variações já calculadas):
${JSON.stringify(data, null, 2)}

REGRAS DE RESPOSTA:
- Responda SOMENTE em JSON estruturado (sem markdown, sem texto livre fora do JSON)
- Todos os valores monetários nos dados já estão em ${currency} — não converta
- As variações percentuais já foram calculadas pelo sistema — use-as, não recalcule
- Seja específico: cite números reais dos dados, não generalize
- Máximo 4 achados no campo "achados"
- Máximo 3 ações no campo "plano"
- O campo "diagnostico" deve ser texto corrido (2-3 parágrafos)

RESPONDA EXCLUSIVAMENTE EM JSON válido seguindo este schema:
${COMPARISON_JSON_SCHEMA}

IMPORTANTE: Responda em ${languageLabel}. Não inclua nenhum texto fora do JSON.`;
}

const AI_CACHE_TTL = 600;

export async function processAiJob(job: Job<AiJobData>) {
  const { type, orgName, providerType, language, currency, country, data, cacheKey } = job.data;

  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const prompt = type === "comparison"
    ? buildComparisonPrompt(orgName, data, language, currency)
    : buildAnalysisPrompt(orgName, providerType ?? "CONVITEDE", data, language, currency, country ?? "BR");

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text);

  await cacheSet(cacheKey, parsed, AI_CACHE_TTL);

  return parsed;
}
