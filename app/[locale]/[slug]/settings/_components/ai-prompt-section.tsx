"use client";

import { useMemo, useState } from "react";
import { IconCopy, IconCheck, IconSparkles } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
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
  "purchase",
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
  if (eventType === "purchase") {
    return `window.Groware.track('purchase', {
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
  customer_id: user.id, // opcional — NUNCA email ou CPF
})`;
  }

  if (eventType === "checkout_started") {
    return `window.Groware.track('checkout_started', {
  gross_value: 89.00,
  currency: '${currency}',
  product_id: product.id,
  product_name: product.name,
  customer_id: user.id,
})`;
  }

  if (eventType === "checkout_abandoned") {
    return `window.Groware.track('checkout_abandoned', {
  gross_value: 89.00,
  currency: '${currency}',
  reason: 'exit',                  // exit | payment_failed | timeout
  customer_id: user.id,
})`;
  }

  if (eventType === "signup") {
    return `// Após criar a conta, identifique o usuário:
Groware.identify(user.id, { name: user.name, email: user.email })

window.Groware.track('signup', {
  dedupe: true,                    // 1 cadastro por sessão (24h)
  customer_type: 'new',            // new | returning
  customer_id: user.id,
})`;
  }

  if (eventType === "trial_started") {
    return `window.Groware.track('trial_started', {
  dedupe: true,                    // 1 trial por sessão (24h)
  plan_id: plan.id,
  plan_name: plan.name,
  customer_id: user.id,
})`;
  }

  if (eventType === "subscription_canceled") {
    return `window.Groware.track('subscription_canceled', {
  dedupe: subscription.id,         // ID único da assinatura no gateway
  subscription_id: subscription.id,
  gross_value: subscription.price,
  currency: '${currency}',
  billing_interval: 'monthly',     // monthly | yearly | weekly
  reason: 'user_canceled',         // user_canceled | payment_failed | upgraded | downgraded
})`;
  }

  if (eventType === "subscription_changed") {
    return `window.Groware.track('subscription_changed', {
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
    return `window.Groware.track('${eventType}', {
  gross_value: /* valor em ${currency} */,
  currency: '${currency}',
  product_id: product.id,
  customer_id: user.id,
})`;
  }

  if (hasSubscription) {
    return `window.Groware.track('${eventType}', {
  subscription_id: subscription.id,
  currency: '${currency}',
  customer_id: user.id,
})`;
  }

  return `window.Groware.track('${eventType}', {
  product_id: /* ID do recurso envolvido */,
  customer_id: user.id,
})`;
}

function buildEventExampleEn(
  eventType: string,
  currency: string,
): string {
  if (eventType === "purchase") {
    return `window.Groware.track('purchase', {
  dedupe: invoice.id,              // REQUIRED: Unique transaction ID from the payment gateway
  gross_value: 89.00,              // required
  currency: '${currency}',         // required always
  discount: 10.00,                 // optional — applied discount
  installments: 1,                 // optional
  payment_method: 'credit_card',   // optional — pix | credit_card | boleto | debit_card
  product_id: product.id,          // optional but recommended
  product_name: product.name,      // optional
  category: product.category,      // optional
  customer_type: 'new',            // optional — new | returning
  customer_id: user.id, // optional — NEVER email or SSN
})`;
  }

  if (eventType === "checkout_started") {
    return `window.Groware.track('checkout_started', {
  gross_value: 89.00,
  currency: '${currency}',
  product_id: product.id,
  product_name: product.name,
  customer_id: user.id,
})`;
  }

  if (eventType === "checkout_abandoned") {
    return `window.Groware.track('checkout_abandoned', {
  gross_value: 89.00,
  currency: '${currency}',
  reason: 'exit',                  // exit | payment_failed | timeout
  customer_id: user.id,
})`;
  }

  if (eventType === "signup") {
    return `// After account creation, identify the user:
Groware.identify(user.id, { name: user.name, email: user.email })

window.Groware.track('signup', {
  dedupe: true,                    // 1 signup per session (24h)
  customer_type: 'new',            // new | returning
  customer_id: user.id,
})`;
  }

  if (eventType === "trial_started") {
    return `window.Groware.track('trial_started', {
  dedupe: true,                    // 1 trial per session (24h)
  plan_id: plan.id,
  plan_name: plan.name,
  customer_id: user.id,
})`;
  }

  if (eventType === "subscription_canceled") {
    return `window.Groware.track('subscription_canceled', {
  dedupe: subscription.id,         // Unique subscription ID from the payment gateway
  subscription_id: subscription.id,
  gross_value: subscription.price,
  currency: '${currency}',
  billing_interval: 'monthly',     // monthly | yearly | weekly
  reason: 'user_canceled',         // user_canceled | payment_failed | upgraded | downgraded
})`;
  }

  if (eventType === "subscription_changed") {
    return `window.Groware.track('subscription_changed', {
  dedupe: subscription.id,         // Unique subscription ID from the payment gateway
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
    return `window.Groware.track('${eventType}', {
  gross_value: /* value in ${currency} */,
  currency: '${currency}',
  product_id: product.id,
  customer_id: user.id,
})`;
  }

  if (hasSubscription) {
    return `window.Groware.track('${eventType}', {
  subscription_id: subscription.id,
  currency: '${currency}',
  customer_id: user.id,
})`;
  }

  return `window.Groware.track('${eventType}', {
  product_id: /* ID of the resource involved */,
  customer_id: user.id,
})`;
}

function buildPromptEn(
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

  const hasPurchase = visibleSteps.some((s) => s.eventType === "purchase");
  const hasCheckoutStarted = visibleSteps.some(
    (s) => s.eventType === "checkout_started",
  );

  const eventExamples = visibleSteps
    .map((step) => {
      const comment = `// ${step.label.toUpperCase()} — fire when "${step.label.toLowerCase()}" happens`;
      const code = buildEventExampleEn(step.eventType, currency);
      return `${comment}\n${code}`;
    })
    .join("\n\n");

  const checkoutStartedSection =
    hasPurchase && !hasCheckoutStarted
      ? `
────────────────────────────────────────────
OPTIONAL EVENT — checkout_started
────────────────────────────────────────────
Fire immediately BEFORE opening the checkout (modal, redirect, etc.).
Not required, but enables checkout abandonment analysis in the dashboard
(how many users started checkout but didn't pay).

// CHECKOUT STARTED — fire when opening the checkout
window.Groware.track('checkout_started', {
  gross_value: 89.00,
  currency: '${currency}',
  product_id: product.id,
  customer_id: user.id,
})

The tracker automatically detects abandonment (beforeunload after checkout_started)
and fires checkout_abandoned without additional code.`
      : "";

  const serverSideSection = hasRecurringRevenue
    ? `
────────────────────────────────────────────
SERVER-SIDE — RENEWALS AND WEBHOOKS
────────────────────────────────────────────
Recurring payments have NO user in the browser. Use server-side track:

// Node.js / Next.js — monthly renewal cron
await fetch('${baseUrl}/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.GROWARE_API_KEY,
    event_type: 'purchase',
    event_time: invoice.created_at,       // ISO 8601 — actual payment date
    dedupe_id: 'purchase:' + invoice.id,  // REQUIRED: Unique invoice ID
    gross_value: subscription.price,
    currency: '${currency}',
    billing_type: 'recurring',
    billing_interval: 'monthly',   // monthly | yearly | weekly
    subscription_id: subscription.id,
    plan_id: subscription.planId,
    customer_id: subscription.customerId,
  }),
})

// Server-side cancellation (non-payment, gateway webhook)
await fetch('${baseUrl}/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.GROWARE_API_KEY,
    event_type: 'subscription_canceled',
    event_time: subscription.canceled_at, // ISO 8601 — actual cancellation date
    dedupe_id: 'subscription_canceled:' + subscription.id,
    subscription_id: subscription.id,
    gross_value: subscription.price,
    currency: '${currency}',
    billing_interval: 'monthly',
    reason: 'payment_failed',
  }),
})`
    : "";

  return `You are a senior engineer. Integrate Groware into the project below following the instructions exactly.

════════════════════════════════════════════
CONTEXT — WHAT IS GROWARE
════════════════════════════════════════════
Groware is a Growth Analytics tool. A JS script (tracker.js) is
installed on the site and sends events to the API. Events feed dashboards
for funnel, revenue, acquisition channels, MRR and churn.

Full documentation: ${baseUrl}/docs

Organization: ${orgName}
Configured funnel: ${funnelLabel}
Base currency: ${currency}

════════════════════════════════════════════
INSTALLATION
════════════════════════════════════════════
Paste this script in the <head> of ALL pages (or in the root layout):

<script
  async
  src="${baseUrl}/tracker.min.js"
  data-key="${apiKey}"
></script>

The tracker automatically captures (no additional code):
- pageview on every page load and SPA navigation
- utm_source, utm_medium, utm_campaign from the URL
- device (mobile | desktop)
- referrer and acquisition channel
- anonymous session_id

After the user logs in, call Groware.identify() to link the profile:

window.Groware.identify(user.id, {
  name: user.name,
  email: user.email,
  phone: user.phone,  // optional
})

// On logout:
window.Groware.reset()

════════════════════════════════════════════
FUNNEL EVENTS — MANDATORY IMPLEMENTATION
════════════════════════════════════════════
${eventExamples}
${checkoutStartedSection}
${serverSideSection}
════════════════════════════════════════════
ENVIRONMENT VARIABLE
════════════════════════════════════════════
// .env.local
GROWARE_API_KEY=${apiKey}

════════════════════════════════════════════
MANDATORY RULES
════════════════════════════════════════════
1. customer_id must be the authenticated user's UUID — NEVER email, SSN, or name
   → customer_id is an opaque identifier; name/email/phone go in Groware.identify()
2. customer_id is REQUIRED in financial and lifecycle events
   (purchase, signup, trial_started, subscription_canceled, subscription_changed)
   → The server returns HTTP 400 if customer_id is missing in these events
   → In custom events (event_custom), customer_id is always recommended when the user is authenticated
3. ALWAYS include currency: '${currency}' in financial events
   (purchase, checkout_started, checkout_abandoned)
4. subscription_id must be unique per subscription — never reuse
5. Renewal events MUST be server-side (no user in the browser)
6. Install the script BEFORE any other script to capture UTMs
7. event_time (optional, ISO 8601) — if the event happened in the past, pass event_time
   with the actual date. Useful for historical data migration. If omitted, uses current time.
   Accepts up to 2 years in the past. Example: event_time: '2026-01-15T10:00:00Z'

════════════════════════════════════════════
VALIDATION — HOW TO CONFIRM IT WORKED
════════════════════════════════════════════
1. Open the site with ?utm_source=test&utm_medium=cpc in the URL
2. Run each funnel flow manually (signup, edit, payment)
3. Open DevTools → Network and confirm POST /api/track with status 204
4. Go to Groware → Data → Events and verify the events appearing
5. For additional diagnostics add data-debug="true" to the script:
   <script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}" data-debug="true"></script>
   and check the [Groware] logs in the browser console

If you have questions about any event or field, consult the documentation:
${baseUrl}/docs

Implement the events in the exact places in the project where each action occurs.
Do not create mocks or fictitious data — connect to the real flows.`;
}

export function buildPrompt(
  apiKey: string,
  baseUrl: string,
  orgName: string,
  currency: string,
  funnelSteps: IFunnelStep[],
  hasRecurringRevenue: boolean,
  locale: string = "pt",
): string {
  if (locale !== "pt") {
    return buildPromptEn(apiKey, baseUrl, orgName, currency, funnelSteps, hasRecurringRevenue);
  }
  const funnelLabel = funnelSteps
    .filter((s) => !s.hidden)
    .map((s) => s.eventType)
    .join(" → ");

  const visibleSteps = funnelSteps.filter(
    (s) => !s.hidden && s.eventType !== "pageview",
  );

  const hasPurchase = visibleSteps.some((s) => s.eventType === "purchase");
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
    hasPurchase && !hasCheckoutStarted
      ? `
────────────────────────────────────────────
EVENTO OPCIONAL — checkout_started
────────────────────────────────────────────
Disparar imediatamente ANTES de abrir o checkout (modal, redirecionamento, etc.).
Não é obrigatório, mas habilita a análise de abandono de checkout no dashboard
(quantos usuários iniciaram o checkout mas não pagaram).

// CHECKOUT INICIADO — disparar ao abrir o checkout
window.Groware.track('checkout_started', {
  gross_value: 89.00,
  currency: '${currency}',
  product_id: product.id,
  customer_id: user.id,
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
    key: process.env.GROWARE_API_KEY,
    event_type: 'purchase',
    event_time: invoice.created_at,       // ISO 8601 — data real do pagamento
    dedupe_id: 'purchase:' + invoice.id,  // OBRIGATÓRIO: ID único da invoice
    gross_value: subscription.price,
    currency: '${currency}',
    billing_type: 'recurring',
    billing_interval: 'monthly',   // monthly | yearly | weekly
    subscription_id: subscription.id,
    plan_id: subscription.planId,
    customer_id: subscription.customerId,
  }),
})

// Cancelo server-side (inadimplência, gateway webhook)
await fetch('${baseUrl}/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.GROWARE_API_KEY,
    event_type: 'subscription_canceled',
    event_time: subscription.canceled_at, // ISO 8601 — data real do cancelamento
    dedupe_id: 'subscription_canceled:' + subscription.id,
    subscription_id: subscription.id,
    gross_value: subscription.price,
    currency: '${currency}',
    billing_interval: 'monthly',
    reason: 'payment_failed',
  }),
})`
    : "";

  return `Você é um engenheiro sênior. Integre o Groware no projeto abaixo seguindo exatamente as instruções.

════════════════════════════════════════════
CONTEXTO — O QUE É O GROWARE
════════════════════════════════════════════
Groware é uma ferramenta de Growth Analytics. Um script JS (tracker.js) é
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
  src="${baseUrl}/tracker.min.js"
  data-key="${apiKey}"
></script>

O tracker captura automaticamente (sem código adicional):
- pageview em cada carregamento de página e navegação SPA
- utm_source, utm_medium, utm_campaign da URL
- device (mobile | desktop)
- referrer e canal de aquisição
- session_id anônimo

Após o login do usuário, chame Groware.identify() para vincular o perfil:

window.Groware.identify(user.id, {
  name: user.name,
  email: user.email,
  phone: user.phone,  // opcional
})

// No logout:
window.Groware.reset()

════════════════════════════════════════════
EVENTOS DO FUNIL — IMPLEMENTAR OBRIGATORIAMENTE
════════════════════════════════════════════
${eventExamples}
${checkoutStartedSection}
${serverSideSection}
════════════════════════════════════════════
VARIÁVEL DE AMBIENTE
════════════════════════════════════════════
// .env.local
GROWARE_API_KEY=${apiKey}

════════════════════════════════════════════
REGRAS OBRIGATÓRIAS
════════════════════════════════════════════
1. customer_id deve ser o UUID do usuário autenticado — NUNCA email, CPF ou nome
   → customer_id é um identificador opaco; nome/email/telefone vão em Groware.identify()
2. customer_id é OBRIGATÓRIO em eventos financeiros e lifecycle
   (purchase, signup, trial_started, subscription_canceled, subscription_changed)
   → O servidor retorna HTTP 400 se customer_id estiver ausente nesses eventos
   → Em eventos customizados (event_custom), customer_id é recomendado sempre que o usuário estiver autenticado
3. SEMPRE incluir currency: '${currency}' em eventos financeiros
   (purchase, checkout_started, checkout_abandoned)
4. subscription_id deve ser único por assinatura — nunca reutilizar
5. Eventos de renovação DEVEM ser server-side (sem usuário no browser)
6. Instalar o script ANTES de qualquer outro script para capturar UTMs
7. event_time (opcional, ISO 8601) — se o evento aconteceu no passado, passe event_time
   com a data real. Útil para migração de dados históricos. Se omitido, usa o horário atual.
   Aceita até 2 anos no passado. Exemplo: event_time: '2026-01-15T10:00:00Z'

════════════════════════════════════════════
VALIDAÇÃO — COMO CONFIRMAR QUE FUNCIONOU
════════════════════════════════════════════
1. Abra o site com ?utm_source=teste&utm_medium=cpc na URL
2. Execute cada fluxo do funil manualmente (cadastro, edição, pagamento)
3. Abra DevTools → Network e confirme POST /api/track com status 204
4. Acesse Groware → Dados → Eventos e verifique os eventos aparecendo
5. Para diagnóstico adicional adicione data-debug="true" no script:
   <script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}" data-debug="true"></script>
   e verifique os logs [Groware] no console do browser

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
  const t = useTranslations("settings.aiPrompt");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => buildPrompt(apiKey, baseUrl, orgName, currency, funnelSteps, hasRecurringRevenue, locale),
    [apiKey, baseUrl, orgName, currency, funnelSteps, hasRecurringRevenue, locale],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success(t("copiedToast"));
  };

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-indigo-500/15">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/30 shrink-0 mt-0.5">
            <IconSparkles size={14} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {t("description")}
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
          {copied ? t("copied") : t("copyPrompt")}
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
