"use client";

import { useMemo, useState } from "react";
import { IconCopy, IconCheck, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IFunnelStep } from "@/interfaces/organization.interface";
import toast from "react-hot-toast";

interface AiPromptSectionProps {
  apiKey: string;
  baseUrl: string;
  orgName: string;
  currency: string;
  funnelSteps: IFunnelStep[];
  hasRecurringRevenue: boolean;
}

const FINANCIAL_EVENTS = new Set([
  "payment",
  "checkout_started",
  "checkout_abandoned",
]);

const SUBSCRIPTION_EVENTS = new Set([
  "subscription_canceled",
  "subscription_changed",
]);

function buildEventExample(
  eventType: string,
  currency: string,
): string {
  if (eventType === "payment") {
    return `window.GrowthOS.track('payment', {
  dedupe: invoice.id,              // OBRIGATÓRIO: ID único da transação no gateway
  gross_value: 89.00,              // obrigatório
  currency: '${currency}',         // obrigatório sempre
  discount: 10.00,                 // opcional — desconto aplicado
  installments: 1,                 // opcional
  payment_method: 'pix',           // opcional — pix | credit_card | boleto | debit_card
  product_id: product.id,          // opcional mas recomendado
  product_name: product.name,      // opcional
  category: product.category,      // opcional
  customer_type: 'new',            // opcional — new | returning
  customer_id: hashAnonymous(user.id), // opcional — NUNCA email ou CPF
})`;
  }

  if (eventType === "checkout_started") {
    return `window.GrowthOS.track('checkout_started', {
  gross_value: 89.00,
  currency: '${currency}',
  product_id: product.id,
  product_name: product.name,
  customer_id: hashAnonymous(user.id),
})`;
  }

  if (eventType === "checkout_abandoned") {
    return `window.GrowthOS.track('checkout_abandoned', {
  gross_value: 89.00,
  currency: '${currency}',
  reason: 'exit',                  // exit | payment_failed | timeout
  customer_id: hashAnonymous(user.id),
})`;
  }

  if (eventType === "signup") {
    return `window.GrowthOS.track('signup', {
  dedupe: true,                    // 1 cadastro por sessão (24h)
  customer_type: 'new',            // new | returning
  customer_id: hashAnonymous(user.id), // NUNCA email ou CPF
})`;
  }

  if (eventType === "trial_started") {
    return `window.GrowthOS.track('trial_started', {
  dedupe: true,                    // 1 trial por sessão (24h)
  plan_id: plan.id,
  plan_name: plan.name,
  customer_id: hashAnonymous(user.id),
})`;
  }

  if (eventType === "subscription_canceled") {
    return `window.GrowthOS.track('subscription_canceled', {
  dedupe: subscription.id,         // ID único da assinatura no gateway
  subscription_id: subscription.id,
  gross_value: subscription.price,
  currency: '${currency}',
  billing_interval: 'monthly',     // monthly | yearly | weekly
  reason: 'user_canceled',         // user_canceled | payment_failed | upgraded | downgraded
})`;
  }

  if (eventType === "subscription_changed") {
    return `window.GrowthOS.track('subscription_changed', {
  dedupe: subscription.id,         // ID único da assinatura no gateway
  subscription_id: subscription.id,
  previous_plan_id: subscription.previousPlanId,
  new_plan_id: subscription.newPlanId,
  previous_value: subscription.previousPrice,
  new_value: subscription.newPrice,
  currency: '${currency}',
  billing_interval: 'monthly',
})`;
  }

  const hasFinancial = FINANCIAL_EVENTS.has(eventType);
  const hasSubscription = SUBSCRIPTION_EVENTS.has(eventType);

  if (hasFinancial) {
    return `window.GrowthOS.track('${eventType}', {
  gross_value: /* valor em ${currency} */,
  currency: '${currency}',
  product_id: product.id,
  customer_id: hashAnonymous(user.id),
})`;
  }

  if (hasSubscription) {
    return `window.GrowthOS.track('${eventType}', {
  subscription_id: subscription.id,
  currency: '${currency}',
  customer_id: hashAnonymous(user.id),
})`;
  }

  return `window.GrowthOS.track('${eventType}', {
  product_id: /* ID do recurso envolvido */,
  customer_id: hashAnonymous(user.id),
})`;
}

export function buildPrompt(
  apiKey: string,
  baseUrl: string,
  orgName: string,
  currency: string,
  funnelSteps: IFunnelStep[],
  hasRecurringRevenue: boolean,
): string {
  const funnelLabel = funnelSteps
    .filter((s) => !s.hidden)
    .map((s) => s.eventType)
    .join(" → ");

  const visibleSteps = funnelSteps.filter(
    (s) => !s.hidden && s.eventType !== "pageview",
  );

  const hasPayment = visibleSteps.some((s) => s.eventType === "payment");
  const hasCheckoutStarted = visibleSteps.some(
    (s) => s.eventType === "checkout_started",
  );

  const eventExamples = visibleSteps
    .map((step) => {
      const comment = `// ${step.label.toUpperCase()} — disparar quando "${step.label.toLowerCase()}" acontecer`;
      const code = buildEventExample(step.eventType, currency);
      return `${comment}\n${code}`;
    })
    .join("\n\n");

  const checkoutStartedSection =
    hasPayment && !hasCheckoutStarted
      ? `
────────────────────────────────────────────
EVENTO OPCIONAL — checkout_started
────────────────────────────────────────────
Disparar imediatamente ANTES de abrir o checkout (modal, redirecionamento, etc.).
Não é obrigatório, mas habilita a análise de abandono de checkout no dashboard
(quantos usuários iniciaram o checkout mas não pagaram).

// CHECKOUT INICIADO — disparar ao abrir o checkout
window.GrowthOS.track('checkout_started', {
  gross_value: 89.00,
  currency: '${currency}',
  product_id: product.id,
  customer_id: hashAnonymous(user.id),
})

O tracker detecta automaticamente o abandono (beforeunload após checkout_started)
e dispara checkout_abandoned sem código adicional.`
      : "";

  const serverSideSection = hasRecurringRevenue
    ? `
────────────────────────────────────────────
SERVER-SIDE — RENOVAÇÕES E WEBHOOKS
────────────────────────────────────────────
Pagamentos recorrentes NÃO têm usuário no browser. Use server-side track:

// Node.js / Next.js — cron de renovação mensal
await fetch('${baseUrl}/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.GROWTHOS_API_KEY,
    event_type: 'payment',
    dedupe_id: 'payment:' + invoice.id,  // OBRIGATÓRIO: ID único da invoice
    gross_value: subscription.price,
    currency: '${currency}',
    billing_type: 'recurring',
    billing_interval: 'monthly',   // monthly | yearly | weekly
    subscription_id: subscription.id,
    plan_id: subscription.planId,
    customer_id: hashAnonymous(subscription.customerId),
  }),
})

// Cancelo server-side (inadimplência, gateway webhook)
await fetch('${baseUrl}/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.GROWTHOS_API_KEY,
    event_type: 'subscription_canceled',
    dedupe_id: 'subscription_canceled:' + subscription.id,
    subscription_id: subscription.id,
    gross_value: subscription.price,
    currency: '${currency}',
    billing_interval: 'monthly',
    reason: 'payment_failed',
  }),
})`
    : "";

  return `Você é um engenheiro sênior. Integre o GrowthOS no projeto abaixo seguindo exatamente as instruções.

════════════════════════════════════════════
CONTEXTO — O QUE É O GROWTHOS
════════════════════════════════════════════
GrowthOS é uma ferramenta de Growth Analytics. Um script JS (tracker.js) é
instalado no site e envia eventos para a API. Os eventos alimentam dashboards
de funil, receita, canais de aquisição, MRR e churn.

Documentação completa: ${baseUrl}/docs

Organização: ${orgName}
Funil configurado: ${funnelLabel}
Moeda base: ${currency}

════════════════════════════════════════════
INSTALAÇÃO
════════════════════════════════════════════
Cole este script no <head> de TODAS as páginas (ou no layout raiz):

<script
  async
  src="${baseUrl}/tracker.js"
  data-key="${apiKey}"
></script>

O tracker captura automaticamente (sem código adicional):
- pageview em cada carregamento de página e navegação SPA
- utm_source, utm_medium, utm_campaign da URL
- device (mobile | desktop)
- referrer e canal de aquisição
- session_id anônimo

════════════════════════════════════════════
EVENTOS DO FUNIL — IMPLEMENTAR OBRIGATORIAMENTE
════════════════════════════════════════════
${eventExamples}
${checkoutStartedSection}
${serverSideSection}
════════════════════════════════════════════
UTILITÁRIO — HASH ANÔNIMO PARA customer_id
════════════════════════════════════════════
Crie este arquivo e use em todos os eventos com customer_id:

// lib/hash-anonymous.ts
import { createHash } from 'crypto'

export function hashAnonymous(id: string): string {
  return createHash('sha256')
    .update(id + (process.env.GROWTHOS_HASH_SALT ?? 'growthos'))
    .digest('hex')
    .slice(0, 32)
}

// .env.local
GROWTHOS_HASH_SALT=uma_string_aleatoria_secreta
GROWTHOS_API_KEY=${apiKey}

════════════════════════════════════════════
REGRAS OBRIGATÓRIAS
════════════════════════════════════════════
1. NUNCA enviar email, CPF, nome ou qualquer PII em customer_id
   → Sempre use hashAnonymous(user.id) ou hashAnonymous(user.email)
2. SEMPRE incluir currency: '${currency}' em eventos financeiros
   (payment, checkout_started, checkout_abandoned)
3. subscription_id deve ser único por assinatura — nunca reutilizar
4. Eventos de renovação DEVEM ser server-side (sem usuário no browser)
5. Instalar o script ANTES de qualquer outro script para capturar UTMs

════════════════════════════════════════════
VALIDAÇÃO — COMO CONFIRMAR QUE FUNCIONOU
════════════════════════════════════════════
1. Abra o site com ?utm_source=teste&utm_medium=cpc na URL
2. Execute cada fluxo do funil manualmente (cadastro, edição, pagamento)
3. Abra DevTools → Network e confirme POST /api/track com status 204
4. Acesse GrowthOS → Dados → Eventos e verifique os eventos aparecendo
5. Para diagnóstico adicional adicione data-debug="true" no script:
   <script async src="${baseUrl}/tracker.js" data-key="${apiKey}" data-debug="true"></script>
   e verifique os logs [GrowthOS] no console do browser

Se tiver dúvidas sobre algum evento ou campo, consulte a documentação:
${baseUrl}/docs

Implemente os eventos nos lugares exatos do projeto onde cada ação acontece.
Não crie mocks ou dados fictícios — conecte nos fluxos reais.`;
}

export function AiPromptSection({
  apiKey,
  baseUrl,
  orgName,
  currency,
  funnelSteps,
  hasRecurringRevenue,
}: AiPromptSectionProps) {
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => buildPrompt(apiKey, baseUrl, orgName, currency, funnelSteps, hasRecurringRevenue),
    [apiKey, baseUrl, orgName, currency, funnelSteps, hasRecurringRevenue],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success("Prompt copiado! Cole no Cursor, Claude ou ChatGPT.");
  };

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-indigo-500/15">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/30 shrink-0 mt-0.5">
            <IconSparkles size={14} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Prompt para IA</h3>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              Cole no{" "}
              <span className="text-zinc-400 font-medium">Cursor</span>,{" "}
              <span className="text-zinc-400 font-medium">Claude</span> ou{" "}
              <span className="text-zinc-400 font-medium">ChatGPT</span> — a IA
              lê seu projeto e implementa a integração automaticamente.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleCopy}
          className={cn(
            "shrink-0 h-8 gap-1.5 text-xs font-semibold transition-all",
            copied
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white",
          )}
        >
          {copied ? (
            <IconCheck size={13} />
          ) : (
            <IconCopy size={13} />
          )}
          {copied ? "Copiado!" : "Copiar prompt"}
        </Button>
      </div>

      <div className="relative">
        <pre className="px-5 py-4 text-[11px] text-zinc-400 font-mono leading-relaxed overflow-y-auto whitespace-pre-wrap break-words max-h-64 scrollbar-thin">
          {prompt}
        </pre>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
