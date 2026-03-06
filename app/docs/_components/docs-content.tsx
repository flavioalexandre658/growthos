"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  IconCheck,
  IconSearch,
  IconPackage,
  IconCode,
  IconServer,
  IconRepeat,
  IconWorld,
  IconBug,
  IconBolt,
  IconPlugConnected,
  IconBrandStripe,
  IconX,
  IconArrowRight,
} from "@tabler/icons-react";
import { CodeBlock } from "./code-block";
import { EventCard } from "./event-card";
import { Callout } from "./callout";
import { AutoPropTable } from "./auto-prop-table";
import { cn } from "@/lib/utils";

interface DocsContentProps {
  serverUrl: string;
}

// ─── Nav structure ────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Início",
    items: [
      { value: "install", label: "Instalação", icon: IconPackage },
      { value: "nextjs", label: "Next.js", icon: IconCode },
      { value: "auto", label: "Auto-tracking" },
    ],
  },
  {
    label: "Eventos",
    items: [
      { value: "manual", label: "Eventos Manuais" },
      { value: "reference", label: "Referência" },
      { value: "attributes", label: "Data Attributes" },
      { value: "dedup", label: "Deduplicação" },
    ],
  },
  {
    label: "Avançado",
    items: [
      { value: "server", label: "Server-Side", icon: IconServer },
      { value: "recurring", label: "Recorrência", icon: IconRepeat },
      { value: "i18n", label: "Multi-moeda", icon: IconWorld },
    ],
  },
  {
    label: "Referência",
    items: [
      { value: "typescript", label: "TypeScript" },
      { value: "api", label: "API Reference" },
      { value: "debug", label: "Debug", icon: IconBug },
    ],
  },
  {
    label: "Integrações",
    items: [
      { value: "integration-overview", label: "Visão geral", icon: IconPlugConnected },
      { value: "integration-stripe", label: "Stripe", icon: IconBrandStripe },
      { value: "integration-together", label: "Usando os dois juntos" },
    ],
  },
];

const ALL_TABS = NAV_GROUPS.flatMap((g) => g.items);

// ─── Auto-captured context ────────────────────────────────────────────────────

const AUTO_CONTEXT_ROWS = [
  { name: "utm_source", source: "?utm_source na URL", example: "google" },
  { name: "utm_medium", source: "?utm_medium na URL", example: "cpc" },
  { name: "utm_campaign", source: "?utm_campaign na URL", example: "black-friday" },
  { name: "utm_content", source: "?utm_content na URL", example: "banner-topo" },
  { name: "landing_page", source: "window.location.pathname", example: "/convite/casamento" },
  { name: "referrer", source: "document.referrer + inferência", example: "instagram.com" },
  { name: "device", source: "navigator.userAgent", example: "mobile | desktop" },
  { name: "session_id", source: "sessionStorage (anônimo, gerado)", example: "s_abc123" },
];

// ─── Code snippets ────────────────────────────────────────────────────────────

const buildInstallHtml = (baseUrl: string) =>
  `<script\n  async\n  src="${baseUrl}/tracker.js"\n  data-key="tok_xxx"\n></script>`;

const buildInstallNextjs = (baseUrl: string) =>
  `import Script from 'next/script'\n\nexport default function RootLayout({ children }) {\n  return (\n    <html>\n      <head />\n      <body>\n        {children}\n        <Script\n          src="${baseUrl}/tracker.js"\n          data-key={process.env.NEXT_PUBLIC_GROWARE_KEY}\n          strategy="afterInteractive"\n        />\n      </body>\n    </html>\n  )\n}`;

const ENV_CODE = `NEXT_PUBLIC_GROWARE_KEY=tok_convitede_xxx`;

const HOOK_CODE = `'use client'\n\nimport { useCallback } from 'react'\nimport type { GrowareEventType, GrowareEventData } from '@/types/groware'\n\nexport function useTracker() {\n  const track = useCallback(\n    (eventType: GrowareEventType, data?: GrowareEventData) => {\n      if (typeof window === 'undefined') return\n      if (!window.Groware) return\n      window.Groware.track(eventType, data)\n    },\n    []\n  )\n  return { track }\n}`;

const HOOK_USAGE = `'use client'\n\nimport { useTracker } from '@/hooks/use-tracker'\n\nexport function CheckoutButton({ product, price }) {\n  const { track } = useTracker()\n\n  const handleCheckout = async () => {\n    track('checkout_started', {\n      gross_value: price,\n      currency: 'BRL',\n      product_id: product.id,\n      product_name: product.name,\n    })\n    await openCheckout(product.id)\n  }\n\n  return <button onClick={handleCheckout}>Comprar R$ {price}</button>\n}`;

const PAYMENT_CODE = `window.Groware.track('purchase', {\n  // Deduplicação — OBRIGATÓRIO para eventos financeiros\n  dedupe: invoice.id,       // ID único da transação no gateway\n\n  // Financeiro — obrigatório\n  gross_value: 150.00,\n  currency: 'BRL',          // ISO 4217 — sempre informe\n\n  // Financeiro — opcional\n  discount: 10.00,          // desconto aplicado em reais\n  installments: 1,\n  payment_method: 'pix',    // pix | credit_card | boleto | debit_card\n\n  // Produto — opcional mas recomendado\n  product_id: 'template-casamento-001',\n  product_name: 'Convite Casamento Premium',\n  category: 'casamento',\n\n  // Cliente — opcional mas recomendado\n  customer_type: 'new',     // new | returning\n  customer_id: 'hash_anonimo',\n  customer_segment: 'premium',\n  customer_cohort: '2024-Q1',\n})`;

const RECURRING_PAYMENT = `// Primeiro pagamento de assinatura\nwindow.Groware.track('purchase', {\n  dedupe: invoice.id,           // ID único da invoice no gateway\n  gross_value: 89.00,\n  currency: 'BRL',\n  billing_type: 'recurring',\n  billing_interval: 'monthly',\n  subscription_id: 'sub_abc123',\n  plan_id: 'plan_pro',\n  plan_name: 'Pro Mensal',\n  customer_id: 'hash_cliente',\n})\n\n// Cancelamento de assinatura\nwindow.Groware.track('subscription_canceled', {\n  dedupe: subscription.id,      // garante dedup deterministico\n  subscription_id: 'sub_abc123',\n  plan_id: 'plan_pro',\n  gross_value: 89.00,\n  currency: 'BRL',\n  billing_interval: 'monthly',\n  reason: 'user_canceled', // user_canceled | payment_failed | upgraded | downgraded\n})\n\n// Upgrade de plano\nwindow.Groware.track('subscription_changed', {\n  dedupe: subscription.id,      // garante dedup deterministico\n  subscription_id: 'sub_abc123',\n  previous_plan_id: 'plan_basic',\n  new_plan_id: 'plan_pro',\n  previous_value: 49.00,\n  new_value: 89.00,\n  billing_interval: 'monthly',\n  currency: 'BRL',\n})`;

const SERVER_FETCH = `// Node.js / Next.js — renovação mensal às 3h da manhã\nawait fetch(\`\${process.env.GROWARE_URL}/api/track\`, {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    key: process.env.GROWARE_API_KEY,\n    event_type: 'purchase',\n    gross_value: 89.00,\n    currency: 'BRL',\n    billing_type: 'recurring',\n    billing_interval: 'monthly',\n    subscription_id: subscription.id,\n    plan_id: subscription.planId,\n    customer_id: hashCustomerId(subscription.customerId),\n  }),\n})`;

const SERVER_CURL = `curl -X POST https://groware.io/api/track \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "key": "tok_convitede_xxx",\n    "event_type": "purchase",\n    "gross_value": 89.00,\n    "currency": "BRL",\n    "billing_type": "recurring",\n    "subscription_id": "sub_abc123"\n  }'`;

const SERVER_PYTHON = `import requests\n\nrequests.post('https://groware.io/api/track', json={\n    'key': 'tok_convitede_xxx',\n    'event_type': 'purchase',\n    'gross_value': 89.00,\n    'currency': 'BRL',\n    'billing_type': 'recurring',\n    'subscription_id': 'sub_abc123',\n})`;

const DATA_ATTRS = `<!-- Botão de compra -->\n<button\n  data-groware="purchase"\n  data-groware-value="89.90"\n  data-groware-currency="BRL"\n  data-groware-product_id="template-001"\n  data-groware-product_name="Convite Casamento"\n  data-groware-payment_method="pix"\n  data-groware-dedupe="invoice-001"\n>\n  Pagar com PIX\n</button>\n\n<!-- Cadastro -->\n<button\n  data-groware="signup"\n  data-groware-customer_type="new"\n  data-groware-dedupe="true"\n>\n  Criar conta grátis\n</button>`;

const TYPES_CODE = `// src/types/groware.d.ts\n\nexport type GrowareEventType =\n  | 'pageview'\n  | 'signup'\n  | 'trial_started'\n  | 'checkout_started'\n  | 'checkout_abandoned'\n  | 'purchase'\n  | 'subscription_canceled'\n  | 'subscription_changed'\n\nexport type GrowareCurrency = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'ARS' | string\nexport type GrowarePaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'boleto' | string\nexport type GrowareBillingInterval = 'monthly' | 'yearly' | 'weekly'\nexport type GrowareBillingType = 'recurring' | 'one_time'\nexport type GrowareCustomerType = 'new' | 'returning'\n\nexport interface GrowareEventData {\n  // Financeiro\n  gross_value?: number\n  discount?: number              // desconto aplicado em reais\n  installments?: number\n  payment_method?: GrowarePaymentMethod\n  currency?: GrowareCurrency      // ISO 4217 — padrão: moeda da org\n\n  // Produto\n  product_id?: string\n  product_name?: string\n  category?: string\n\n  // Cliente\n  customer_type?: GrowareCustomerType\n  customer_id?: string             // hash anônimo — NUNCA email/CPF\n  customer_segment?: string\n  customer_cohort?: string\n\n  // Recorrência\n  billing_type?: GrowareBillingType\n  billing_interval?: GrowareBillingInterval\n  subscription_id?: string\n  plan_id?: string\n  plan_name?: string\n\n  // Subscription events\n  previous_plan_id?: string\n  new_plan_id?: string\n  previous_value?: number\n  new_value?: number\n  reason?: 'user_canceled' | 'payment_failed' | 'upgraded' | 'downgraded' | 'exit' | 'timeout'\n\n  // Livre\n  metadata?: Record<string, unknown>\n}\n\ndeclare global {\n  interface Window {\n    Groware: {\n      track: (eventType: GrowareEventType, data?: GrowareEventData) => void\n    }\n  }\n}`;

const DEBUG_CODE = `// 1 — Verificar se o tracker carregou\nconsole.log(window.Groware)\n// → { track: ƒ }\n\n// 2 — Disparar evento de teste\nwindow.Groware.track('pageview')\n// → Network: POST /api/track 204\n\n// 3 — Evento com moeda\nwindow.Groware.track('purchase', {\n  gross_value: 1.00,\n  currency: 'BRL',\n  product_name: 'Teste'\n})\n// Verificar em Dados → Eventos`;

const DEDUP_CODE = `// ── Client-side: localStorage com TTL de 24h ────────────────────────────────\n\n// dedupe: true  →  1 evento por tipo (persiste entre abas e reloads, 24h)\nwindow.Groware.track('signup', { dedupe: true })\n\n// dedupe: <id>  →  1 evento por ID (OBRIGATÓRIO para purchase/refund)\n// Use SEMPRE o ID da transação do gateway — nunca um valor gerado no client\nwindow.Groware.track('purchase', {\n  gross_value: 89.00,\n  dedupe: invoice.id,  // ← "inv_stripe_xxx" — imutável e único\n})\n// O tracker envia automaticamente dedupe_id ao servidor quando dedupe é string.\n// Isso garante dedup server-side deterministico via SHA256(orgId:dedupe_id).\n\n// ── Server-side: duas camadas ────────────────────────────────────────────────\n// 1. Se dedupe_id presente → hash SHA256 determinístico (sem janela de tempo)\n//    Mesmo invoice.id = mesmo hash, sempre. Proteção máxima.\n//\n// 2. Se dedupe_id ausente → hash de fallback com janela diária (24h)\n//    Usa: event_type + customer_id + gross_value + product_id + subscription_id\n//    Menos preciso — duas compras idênticas no mesmo dia seriam deduplicadas.\n//\n// Envios duplicados retornam 204 com X-Groware-Duplicate: true\n// Eventos financeiros sem dedupe_id retornam X-Groware-Warning no header.\n\nawait fetch('/api/track', {\n  body: JSON.stringify({\n    key: 'tok_xxx',\n    event_type: 'purchase',\n    gross_value: 89.00,\n    dedupe_id: 'purchase:inv_stripe_xxx', // ← obrigatório para dedup confiável\n    customer_id: 'usr_abc123',\n    subscription_id: 'sub_xyz',\n  })\n})`;

const STRIPE_METADATA_CODE = `// Passando customer_id nos metadados do Stripe Checkout
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  metadata: {
    groware_customer_id: sha256(user.id + process.env.CUSTOMER_HASH_SALT),
  },
  // ...
})`;

const STRIPE_TOGETHER_FLOW = `// 1 — Usuário chega via Google Ads
//     Groware (tracker.js): pageview · source: google · session: s_abc

// 2 — Usuário cria conta
//     Groware (tracker.js): signup · customer_id: hash_xyz · source: google

// 3 — Usuário inicia checkout (PASSE o customer_id aqui)
window.Groware.track('checkout_started', {
  gross_value: 79.90,
  currency: 'BRL',
  product_name: 'Pro Mensal',
  customer_id: hash_xyz,  // ← bridge entre tracker.js e Stripe
})

// 4 — Stripe processa o pagamento
//     metadata: { groware_customer_id: "hash_xyz" }

// 5 — Webhook chega no Groware
//     Groware busca hash_xyz na events table
//     Encontra: source: google · landing: /pricing
//     Salva purchase com contexto completo ✅

// 6 — Dashboard de Canais
//     Google Ads → R$ 4.320,00 receita gerada ✅`;

// ─── Checklist items ──────────────────────────────────────────────────────────

const CHECKLIST = [
  { label: "Script carregou sem erro no Network", detail: "Network → tracker.js → status 200" },
  { label: "window.Groware existe no console", detail: "typeof window.Groware === 'object'" },
  { label: "UTMs capturados corretamente", detail: "Acesse /?utm_source=teste e confira o payload no Network" },
  { label: "POST /api/track retorna 204", detail: "Disparar evento manual e verificar no Network" },
  { label: "Currency presente em eventos financeiros", detail: "Payload deve ter currency: 'BRL' (ou a moeda da venda)" },
  { label: "Dados aparecem em Dados → Eventos", detail: "Aguardar até 30s e atualizar a tela" },
  { label: "Sem PII nos payloads", detail: "Nunca enviar email, CPF ou nome em customer_id" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DocsContent({ serverUrl }: DocsContentProps) {
  const [active, setActive] = useState("install");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_TABS;
    return ALL_TABS.filter((t) =>
      t.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <Tabs
      value={active}
      onValueChange={setActive}
      className="flex h-full"
    >
      {/* ── Sidebar ── */}
      <div className="w-60 shrink-0 flex flex-col border-r border-zinc-800/50 overflow-y-auto">
        {/* Title + Search */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800/50 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 ring-1 ring-indigo-500/30 shrink-0">
              <IconBolt size={12} className="text-indigo-400" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-zinc-100 truncate">Tracker Docs</span>
              <span className="font-mono text-[10px] border border-zinc-700 text-zinc-500 px-1.5 py-px rounded shrink-0">v1.0</span>
            </div>
          </div>
          <div className="relative">
            <IconSearch
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600"
            />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-7 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 py-4 px-3">
          {search.trim() ? (
            // Search results flat
            <div className="space-y-0.5">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <NavItem
                    key={item.value}
                    item={item}
                    active={active}
                    onSelect={setActive}
                  />
                ))
              ) : (
                <p className="text-xs text-zinc-600 px-2 py-2">Nenhum resultado</p>
              )}
            </div>
          ) : (
            // Grouped nav
            <div className="space-y-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {group.label}
                  </p>
                  <div className="space-y-px">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.value}
                        item={item}
                        active={active}
                        onSelect={setActive}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <TabsList className="hidden" />
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl px-8 py-6 pb-20">

          {/* INSTALAÇÃO */}
          <TabsContent value="install" className="mt-0 space-y-6">
            <SectionHeader title="Instalação" badge="2 linhas" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Adicione o script no{" "}
              <Mono>{"<head>"}</Mono> de qualquer página. Substitua{" "}
              <Mono className="text-green-400">tok_xxx</Mono> pela API key disponível em{" "}
              <strong className="text-zinc-300">Configurações → API Keys</strong>.
            </p>

            <CodeBlock code={buildInstallHtml(serverUrl)} lang="html" title="Qualquer sistema HTML" />

            <Callout type="tip">
              Instale <strong>antes</strong> de qualquer outro script para garantir que UTMs e referrer sejam capturados desde o primeiro carregamento.
            </Callout>

            <SubSection title="Atributos do script">
              <AttrTable rows={[
                { name: "data-key", required: "sim", desc: "API key da organização. Obtida em Configurações.", example: "tok_convitede_xxx" },
                { name: "data-debug", required: "não", desc: 'Habilita logs no console: "[Groware] track: evento {...}".', example: "true" },
                { name: "data-auto-abandon", required: "não", desc: "Desabilita detecção automática de checkout_abandoned no beforeunload.", example: "false" },
              ]} />
            </SubSection>

            <SubSection title="O que é capturado automaticamente">
              <AutoPropTable rows={AUTO_CONTEXT_ROWS} />
            </SubSection>
          </TabsContent>

          {/* NEXT.JS */}
          <TabsContent value="nextjs" className="mt-0 space-y-6">
            <SectionHeader title="Next.js" badge="App Router" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Use o componente <Mono>Script</Mono> do Next.js no{" "}
              <Mono>layout.tsx</Mono> raiz com <Mono>strategy=&quot;afterInteractive&quot;</Mono>.
            </p>

            <CodeBlock code={buildInstallNextjs(serverUrl)} lang="tsx" title="app/layout.tsx" />
            <CodeBlock code={ENV_CODE} lang="bash" title=".env.local" />

            <Callout type="warn">
              Nunca exponha a API key no client-side de forma pública. A chave no tracker é segura pois é validada pelo Groware — mas nunca a use em chamadas autenticadas de admin.
            </Callout>

            <SubSection title="Hook reutilizável (recomendado)">
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Encapsula <Mono>window.Groware</Mono> com tipagem TypeScript e proteção SSR.
              </p>
              <CodeBlock code={HOOK_CODE} lang="ts" title="hooks/use-tracker.ts" />
              <CodeBlock code={HOOK_USAGE} lang="tsx" title="Usando em um componente" />
            </SubSection>
          </TabsContent>

          {/* AUTO-TRACKING */}
          <TabsContent value="auto" className="mt-0 space-y-6">
            <SectionHeader title="Auto-Tracking" badge="zero config" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Eventos e contexto capturados automaticamente — sem código adicional.
            </p>

            <div className="rounded-lg border border-zinc-800/60 overflow-hidden">
              <div className="grid grid-cols-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60">
                <span>Evento</span>
                <span>Quando dispara</span>
                <span>Dados automáticos</span>
              </div>
              {[
                ["pageview", "Carregamento da página", "landing_page, referrer, device, UTMs"],
                ["pageview", "Navegação SPA (history.pushState)", "nova landing_page, mantém session_id"],
                ["checkout_abandoned", "beforeunload após checkout_started", "gross_value do checkout_started"],
              ].map(([ev, when, data], i) => (
                <div key={i} className="grid grid-cols-3 text-sm px-4 py-3 border-b border-zinc-800/40 last:border-0 hover:bg-zinc-900/30 transition-colors">
                  <code className="font-mono text-xs text-indigo-400">{ev}</code>
                  <span className="text-xs text-zinc-400">{when}</span>
                  <span className="text-xs text-zinc-500">{data}</span>
                </div>
              ))}
            </div>

            <Callout type="info">
              Você <strong>nunca</strong> precisa passar manualmente:{" "}
              <Mono>source</Mono>, <Mono>medium</Mono>, <Mono>campaign</Mono>,{" "}
              <Mono>landing_page</Mono>, <Mono>device</Mono>, <Mono>referrer</Mono> ou{" "}
              <Mono>session_id</Mono>. O tracker injeta automaticamente em todo evento.
            </Callout>
          </TabsContent>

          {/* EVENTOS MANUAIS */}
          <TabsContent value="manual" className="mt-0 space-y-6">
            <SectionHeader title="Eventos Manuais" badge="window.Groware.track" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Para eventos que dependem de lógica do sistema. Sempre passe{" "}
              <Mono className="text-amber-400">currency</Mono> em eventos financeiros.
            </p>
            <CodeBlock code={PAYMENT_CODE} lang="js" title="purchase — mais importante" />
          </TabsContent>

          {/* REFERÊNCIA */}
          <TabsContent value="reference" className="mt-0 space-y-6">
            <SectionHeader title="Referência de Eventos" />
            <p className="text-sm text-zinc-400">
              Todos os eventos e propriedades. <span className="text-red-400">*</span> = obrigatório.
            </p>

            <div className="space-y-5">
              <EventCard
                name="purchase"
                description="Compra confirmada. Alimenta faturamento, P&L, ticket médio e ROAS."
                variant="default"
                props={[
                  { name: "gross_value", type: "number", required: true, description: "Valor bruto cobrado", example: "150.00" },
                  { name: "currency", type: "string", required: true, description: "ISO 4217 — sempre informe", example: "'BRL'" },
                  { name: "discount", type: "number", description: "Desconto aplicado em reais", example: "10.00" },
                  { name: "installments", type: "number", description: "Número de parcelas", example: "3" },
                  { name: "payment_method", type: "string", description: "pix | credit_card | boleto | debit_card", example: "'pix'" },
                  { name: "product_id", type: "string", description: "ID único do produto", example: "'template-001'" },
                  { name: "product_name", type: "string", description: "Nome legível do produto", example: "'Convite Casamento'" },
                  { name: "category", type: "string", description: "Categoria do produto", example: "'casamento'" },
                  { name: "customer_type", type: "string", description: "new | returning", example: "'new'" },
                  { name: "customer_id", type: "string", required: true, description: "Hash anônimo (nunca PII). Obrigatório — servidor retorna 400 se ausente.", example: "'hash_abc'" },
                  { name: "customer_segment", type: "string", description: "Segmentação do seu negócio", example: "'premium'" },
                  { name: "billing_type", type: "string", description: "recurring | one_time", example: "'one_time'" },
                  { name: "billing_interval", type: "string", description: "monthly | yearly | weekly. Obrigatório se recurring.", example: "'monthly'" },
                  { name: "subscription_id", type: "string", description: "ID da assinatura no gateway. Obrigatório se recurring.", example: "'sub_abc'" },
                  { name: "plan_id", type: "string", description: "ID do plano", example: "'plan_pro'" },
                  { name: "plan_name", type: "string", description: "Nome do plano", example: "'Pro Mensal'" },
                ]}
              />

              <EventCard
                name="signup"
                description="Novo cadastro. Calcula taxa de conversão e funil."
                variant="secondary"
                props={[
                  { name: "customer_id", type: "string", required: true, description: "Hash anônimo (nunca PII). Obrigatório — servidor retorna 400 se ausente.", example: "'hash_abc'" },
                  { name: "customer_type", type: "string", description: "new | returning", example: "'new'" },
                ]}
              />

              <EventCard
                name="checkout_started"
                description="Início do checkout. Par com checkout_abandoned para calcular abandono."
                variant="outline"
                props={[
                  { name: "gross_value", type: "number", description: "Valor no carrinho", example: "89.00" },
                  { name: "currency", type: "string", required: true, description: "ISO 4217", example: "'BRL'" },
                  { name: "product_id", type: "string", description: "ID do produto", example: "'template-001'" },
                  { name: "customer_id", type: "string", description: "Hash anônimo do cliente. Recomendado se você usa a integração Stripe — permite linkar o pagamento ao histórico de aquisição.", example: "'hash_xyz'" },
                ]}
              />
              <Callout type="tip">
                Se você usa a <strong>integração com Stripe</strong>, passe{" "}
                <Mono>customer_id</Mono> no <Mono>checkout_started</Mono>. O Groware usa esse hash para recuperar
                automaticamente a origem do cliente (UTM, landing page, canal) e atribuí-la ao pagamento que chega via webhook —
                sem nenhum código extra no backend.
              </Callout>

              <EventCard
                name="checkout_abandoned"
                description="Checkout não concluído. Representa receita perdida no P&L."
                variant="destructive"
                props={[
                  { name: "gross_value", type: "number", description: "Valor que não converteu", example: "89.00" },
                  { name: "currency", type: "string", required: true, description: "ISO 4217", example: "'BRL'" },
                  { name: "reason", type: "string", description: "exit | payment_failed | timeout", example: "'exit'" },
                ]}
              />

              <EventCard
                name="subscription_canceled"
                description="Assinatura cancelada. Alimenta Churn MRR e Churn Rate."
                variant="destructive"
                props={[
                  { name: "subscription_id", type: "string", required: true, description: "ID da assinatura no seu sistema", example: "'sub_abc'" },
                  { name: "customer_id", type: "string", required: true, description: "Hash anônimo (nunca PII). Obrigatório — servidor retorna 400 se ausente.", example: "'hash_abc'" },
                  { name: "gross_value", type: "number", description: "MRR que vai parar de entrar", example: "89.00" },
                  { name: "currency", type: "string", required: true, description: "ISO 4217", example: "'BRL'" },
                  { name: "billing_interval", type: "string", description: "monthly | yearly | weekly", example: "'monthly'" },
                  { name: "reason", type: "string", description: "user_canceled | payment_failed | upgraded | downgraded", example: "'user_canceled'" },
                ]}
              />

              <EventCard
                name="subscription_changed"
                description="Upgrade ou downgrade de plano. Alimenta Expansion e Contraction MRR."
                variant="secondary"
                props={[
                  { name: "subscription_id", type: "string", required: true, description: "ID da assinatura", example: "'sub_abc'" },
                  { name: "customer_id", type: "string", required: true, description: "Hash anônimo (nunca PII). Obrigatório — servidor retorna 400 se ausente.", example: "'hash_abc'" },
                  { name: "previous_plan_id", type: "string", description: "Plano anterior", example: "'plan_basic'" },
                  { name: "new_plan_id", type: "string", description: "Novo plano", example: "'plan_pro'" },
                  { name: "previous_value", type: "number", description: "Valor do plano anterior", example: "49.00" },
                  { name: "new_value", type: "number", description: "Valor do novo plano", example: "89.00" },
                  { name: "currency", type: "string", required: true, description: "ISO 4217", example: "'BRL'" },
                ]}
              />

              <EventCard
                name="event_custom"
                description="Evento personalizado com qualquer nome. Use para rastrear ações específicas do seu produto — cliques, engajamentos, marcos do funil."
                variant="outline"
                props={[
                  { name: "customer_id", type: "string", description: "Hash anônimo do usuário. Recomendado sempre que o usuário estiver autenticado — conecta o evento ao funil de conversão.", example: "'hash_abc'" },
                  { name: "gross_value", type: "number", description: "Valor monetário associado à ação, se aplicável", example: "29.90" },
                  { name: "currency", type: "string", description: "ISO 4217. Necessário se gross_value for informado.", example: "'BRL'" },
                  { name: "product_id", type: "string", description: "ID do recurso ou produto envolvido", example: "'template-001'" },
                  { name: "product_name", type: "string", description: "Nome legível do recurso", example: "'Convite Aniversário'" },
                  { name: "category", type: "string", description: "Categoria para agrupamento nos relatórios", example: "'engajamento'" },
                  { name: "metadata", type: "object", description: "Dados adicionais livres (máx 20 chaves, strings/números/booleanos)", example: "{ step: 'preview', plan: 'pro' }" },
                ]}
              />
            </div>

            <Callout type="warn">
              <strong>customer_id obrigatório em eventos financeiros e lifecycle.</strong>
              <br />
              Os eventos <Mono>purchase</Mono>, <Mono>refund</Mono>, <Mono>renewal</Mono>, <Mono>signup</Mono>, <Mono>trial_started</Mono>, <Mono>subscription_canceled</Mono> e <Mono>subscription_changed</Mono> exigem <Mono>customer_id</Mono>. O servidor retorna <strong>HTTP 400</strong> se o campo estiver ausente. Use sempre um hash anônimo — nunca envie email, CPF ou nome.
              <br />
              Em eventos customizados (<Mono>event_custom</Mono>), o <Mono>customer_id</Mono> é recomendado sempre que o usuário estiver autenticado, pois vincula a ação ao histórico de aquisição e funil do cliente.
            </Callout>
          </TabsContent>

          {/* DATA ATTRIBUTES */}
          <TabsContent value="attributes" className="mt-0 space-y-6">
            <SectionHeader title="Data Attributes" badge="sem JavaScript" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Rastreie cliques em elementos HTML sem código JS. Útil em templates e páginas estáticas.
            </p>
            <CodeBlock code={DATA_ATTRS} lang="html" title="HTML — data attributes" />
            <AttrTable rows={[
              { name: "data-groware", required: "sim", desc: "Define o tipo do evento", example: "purchase" },
              { name: "data-groware-value", required: "não", desc: "gross_value (converte ponto decimal)", example: "89.90" },
              { name: "data-groware-currency", required: "não", desc: "ISO 4217 — padrão: moeda da org", example: "BRL" },
              { name: "data-groware-product_id", required: "não", desc: "ID do produto", example: "template-001" },
              { name: "data-groware-payment_method", required: "não", desc: "Método de pagamento", example: "pix" },
              { name: "data-groware-dedupe", required: "não", desc: "'true' para dedup por tipo, ou ID único da transação para dedup preciso (obrigatório em purchase)", example: "invoice-001" },
            ]} />
          </TabsContent>

          {/* DEDUPLICAÇÃO */}
          <TabsContent value="dedup" className="mt-0 space-y-6">
            <SectionHeader title="Deduplicação" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              A deduplicação funciona em duas camadas: <strong className="text-zinc-300">client-side</strong> via opção{" "}
              <Mono>dedupe</Mono> no tracker, e <strong className="text-zinc-300">server-side</strong> via hash automático
              calculado a partir do conteúdo do evento.
            </p>
            <CodeBlock code={DEDUP_CODE} lang="js" title="Deduplicação" />
            <Callout type="warn">
              Para eventos financeiros (<Mono>purchase</Mono>, <Mono>refund</Mono>, <Mono>renewal</Mono>),
              sempre passe <Mono>dedupe</Mono> com o ID unico da transacao no gateway (ex: <Mono>invoice.id</Mono>).
              Para eventos de ciclo de vida de assinatura (<Mono>subscription_canceled</Mono>, <Mono>subscription_changed</Mono>),
              passe <Mono>dedupe: subscription.id</Mono> — o servidor tambem usa <Mono>subscription_id</Mono> como chave
              deterministica de fallback se presente. O tracker envia automaticamente <Mono>dedupe_id</Mono> ao servidor,
              que gera um hash SHA256 deterministico — garantindo dedup perfeito independente de reloads, novas abas ou
              visitas futuras. Sem identificadores de dedup, o servidor usa um hash de fallback com janela diaria (24h) e
              retorna <Mono>X-Groware-Warning</Mono> no header.
            </Callout>
          </TabsContent>

          {/* SERVER-SIDE */}
          <TabsContent value="server" className="mt-0 space-y-6">
            <SectionHeader title="Server-Side Track" badge="Node · Python · curl" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              O <Mono>/api/track</Mono> é um endpoint HTTP padrão. Qualquer linguagem ou ambiente que faz requisições HTTP pode enviar eventos — crons, workers, webhooks, lambdas.
            </p>

            <Callout type="warn">
              Eventos server-side <strong>não têm contexto automático</strong> (UTMs, device, referrer). Esses campos serão <Mono>null</Mono> e os relatórios de Canais e Landing Pages não os refletirão. É o comportamento esperado — renovações de assinatura não têm origem de canal.
            </Callout>

            <SubSection title="Quando usar server-side">
              <div className="grid gap-2">
                {[
                  ["Renovação automática de assinatura", "Acontece no servidor às 3h — sem usuário no browser"],
                  ["Cancelamento por inadimplência", "Processado pelo gateway, sem interação do usuário"],
                  ["Upgrade via painel admin", "Você admin altera o plano, não o cliente"],
                  ["Migração de dados históricos", "Import one-time de pagamentos antigos"],
                  ["Webhook de gateway externo", "Stripe, Asaas, Kiwify chamam sua API"],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-3 rounded-lg border border-zinc-800/60 px-4 py-3">
                    <IconCheck size={14} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Node.js / Next.js">
              <CodeBlock code={SERVER_FETCH} lang="ts" title="Renovação mensal — cron job" />
            </SubSection>

            <SubSection title="curl / bash">
              <CodeBlock code={SERVER_CURL} lang="bash" title="Cron ou script de migração" />
            </SubSection>

            <SubSection title="Python">
              <CodeBlock code={SERVER_PYTHON} lang="python" title="Worker Python" />
            </SubSection>
          </TabsContent>

          {/* RECORRÊNCIA */}
          <TabsContent value="recurring" className="mt-0 space-y-6">
            <SectionHeader title="Recorrência" badge="MRR · Churn · LTV" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Para alimentar a tela de Recorrência (MRR, ARR, Churn, ARPU, LTV) você precisa
              identificar pagamentos recorrentes e disparar eventos de ciclo de vida da assinatura.
            </p>

            <Callout type="info">
              Renovações automáticas acontecem no servidor — use <strong>Server-Side Track</strong> para enviá-las.
              O tracker.js cobre apenas o primeiro pagamento (quando o usuário está na página).
            </Callout>

            <CodeBlock code={RECURRING_PAYMENT} lang="js" title="Eventos de recorrência" />

            <SubSection title="Campos obrigatórios para MRR correto">
              <AttrTable rows={[
                { name: "billing_type", required: "sim", desc: "Deve ser 'recurring'", example: "recurring" },
                { name: "billing_interval", required: "sim", desc: "Ciclo de cobrança", example: "monthly" },
                { name: "subscription_id", required: "sim", desc: "Chave de upsert na tabela subscriptions", example: "sub_abc123" },
                { name: "currency", required: "sim", desc: "ISO 4217 — afeta o MRR consolidado", example: "BRL" },
              ]} />
            </SubSection>

            <Callout type="warn">
              O <Mono>subscription_id</Mono> é a chave que o Groware usa para manter o estado da assinatura
              na tabela <Mono>subscriptions</Mono>. Use sempre o ID do seu gateway ou sistema —
              nunca reutilize o mesmo ID para assinaturas diferentes.
            </Callout>
          </TabsContent>

          {/* MULTI-MOEDA */}
          <TabsContent value="i18n" className="mt-0 space-y-6">
            <SectionHeader title="Multi-moeda" badge="ISO 4217" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Organizações que vendem em múltiplas moedas têm todos os valores convertidos
              para a moeda base da organização no momento da ingestão.
            </p>

            <SubSection title="Como funciona a conversão">
              <div className="space-y-2">
                {[
                  ["1. Evento recebido", "O tracker envia gross_value: 15.00, currency: 'USD'."],
                  ["2. Moeda base verificada", "Servidor lê a moeda base da org (ex: BRL)."],
                  ["3. Taxa consultada", "Busca a taxa USD→BRL configurada em Configurações → Taxas de Câmbio."],
                  ["4. Ambos os valores salvos", "gross_value_in_cents = 1500 (USD original), base_gross_value_in_cents = 7800 (BRL)."],
                  ["5. Dashboard usa base_value", "Todos os gráficos somam base_gross_value_in_cents, consolidando na moeda base."],
                ].map(([step, desc]) => (
                  <div key={step} className="rounded-lg border border-zinc-800/60 px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-300">{step}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Enviando eventos com moeda">
              <CodeBlock
                code={`// Mesma moeda da org — currency é opcional\nwindow.Groware.track('purchase', {\n  gross_value: 89.00,\n  currency: 'BRL',\n})\n\n// Moeda diferente — requer taxa configurada\nwindow.Groware.track('purchase', {\n  gross_value: 15.00,\n  currency: 'USD', // precisa de USD→BRL em Configurações\n})`}
                lang="js"
                title="tracker.js"
              />
            </SubSection>

            <Callout type="warn">
              Se um evento chegar com moeda diferente da base e <strong>não houver taxa configurada</strong>,
              o evento será rejeitado com erro <Mono>400</Mono>. Configure a taxa em{" "}
              <strong className="text-zinc-300">Configurações → Taxas de Câmbio</strong> antes de enviar.
            </Callout>
          </TabsContent>

          {/* TYPESCRIPT */}
          <TabsContent value="typescript" className="mt-0 space-y-6">
            <SectionHeader title="TypeScript" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Copie para <Mono>src/types/groware.d.ts</Mono> para tipagem completa no projeto.
            </p>
            <CodeBlock code={TYPES_CODE} lang="ts" title="src/types/groware.d.ts" />
          </TabsContent>

          {/* API REFERENCE */}
          <TabsContent value="api" className="mt-0 space-y-6">
            <SectionHeader title="API Reference" badge="POST /api/track" />

            <SubSection title="Endpoint">
              <CodeBlock
                code={`POST ${serverUrl}/api/track\nContent-Type: application/json`}
                lang="http"
              />
            </SubSection>

            <SubSection title="Campos do payload">
              <AttrTable rows={[
                { name: "key", required: "sim", desc: "API key da organização", example: "tok_xxx" },
                { name: "event_type", required: "sim", desc: "Tipo do evento", example: "purchase" },
                { name: "gross_value", required: "não", desc: "Valor bruto (decimal)", example: "89.90" },
                { name: "currency", required: "não", desc: "ISO 4217 — padrão: moeda da org", example: "BRL" },
                { name: "customer_id", required: "não", desc: "ID do cliente (melhora dedup server-side)", example: "usr_abc123" },
                { name: "...outros", required: "não", desc: "Qualquer campo de GrowareEventData", example: "" },
              ]} />
            </SubSection>

            <SubSection title="Respostas">
              <div className="space-y-2">
                {[
                  ["204", "text-green-400", "Evento registrado com sucesso (sem body)"],
                  ["400", "text-red-400", "Payload inválido, moeda sem taxa configurada"],
                  ["401", "text-red-400", "API key inválida ou revogada"],
                  ["413", "text-amber-400", "Payload maior que 64KB"],
                  ["429", "text-amber-400", "Rate limit excedido (1000 req/min por key)"],
                ].map(([code, color, desc]) => (
                  <div key={code} className="flex items-center gap-3 rounded-lg border border-zinc-800/60 px-4 py-2.5">
                    <code className={cn("font-mono text-sm font-bold w-8", color)}>{code}</code>
                    <span className="text-xs text-zinc-400">{desc}</span>
                  </div>
                ))}
              </div>
            </SubSection>
          </TabsContent>

          {/* DEBUG */}
          <TabsContent value="debug" className="mt-0 space-y-6">
            <SectionHeader title="Debug & Validação" />

            <CodeBlock code={`<script\n  src="${serverUrl}/tracker.js"\n  data-key="tok_xxx"\n  data-debug="true"\n></script>`} lang="html" title="Ativar modo debug" />
            <CodeBlock code={DEBUG_CODE} lang="js" title="Console do navegador" />

            <Separator className="bg-zinc-800/60" />

            <SubSection title="Checklist de validação">
              <div className="space-y-2">
                {CHECKLIST.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-lg border border-zinc-800/60 px-4 py-3 hover:bg-zinc-900/30 transition-colors">
                    <IconCheck size={14} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{item.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <Callout type="warn">
              <strong>Nunca envie PII no customer_id.</strong> Use sempre um hash anônimo.
              Ex: <Mono>sha256(user.id + salt)</Mono>. Nome, email e CPF nunca devem
              aparecer em nenhum campo do payload.
            </Callout>
          </TabsContent>

          {/* INTEGRAÇÃO — VISÃO GERAL */}
          <TabsContent value="integration-overview" className="mt-0 space-y-6">
            <SectionHeader title="Integrações" badge="dois modos" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Existem dois modos de enviar dados para o Groware. Você pode usar os dois ao mesmo tempo ou só um — mas precisa entender o que cada um cobre.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <IconCode size={13} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">Tracker.js</p>
                  <span className="ml-auto text-[10px] font-mono border border-zinc-700 text-zinc-500 px-1.5 py-px rounded">manual</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    "Pageviews e navegação",
                    "Cadastros (signup)",
                    "Funil de conversão",
                    "Contexto de aquisição (UTMs)",
                    "Qualquer gateway de pagamento",
                    "Eventos customizados",
                  ].map((item) => (
                    <p key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconCheck size={11} className="text-green-500 shrink-0" />
                      {item}
                    </p>
                  ))}
                  <div className="pt-1 border-t border-zinc-800/60 space-y-1.5 mt-2">
                    {[
                      "Renovações automáticas de assinatura",
                      "Cancelamentos por inadimplência",
                      "Histórico anterior à instalação",
                    ].map((item) => (
                      <p key={item} className="flex items-center gap-2 text-xs text-zinc-600">
                        <IconX size={11} className="text-zinc-600 shrink-0" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#635BFF]/20 bg-[#635BFF]/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#635BFF]/15 flex items-center justify-center shrink-0">
                    <IconBrandStripe size={13} className="text-[#635BFF]" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">Stripe</p>
                  <span className="ml-auto text-[10px] font-mono border border-zinc-700 text-zinc-500 px-1.5 py-px rounded">automático</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    "Todo o histórico de pagamentos",
                    "Assinaturas — criação, renovação",
                    "Upgrade e cancelamento",
                    "Pagamentos avulsos (one-time)",
                    "Inadimplência e reembolsos",
                    "Zero código adicional",
                  ].map((item) => (
                    <p key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                      <IconCheck size={11} className="text-green-500 shrink-0" />
                      {item}
                    </p>
                  ))}
                  <div className="pt-1 border-t border-zinc-800/60 space-y-1.5 mt-2">
                    {[
                      "Pageviews e navegação do site",
                      "De onde vieram os clientes (UTMs)",
                      "Gateways que não sejam Stripe",
                    ].map((item) => (
                      <p key={item} className="flex items-center gap-2 text-xs text-zinc-600">
                        <IconX size={11} className="text-zinc-600 shrink-0" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Callout type="warn">
              <strong>Ponto crítico — conectou o Stripe, não dispare mais eventos de purchase manualmente.</strong>
              <br />
              O webhook do Stripe e o tracker.js registrariam o mesmo pagamento duas vezes.
              O Groware detecta a origem pelo campo <code className="font-mono text-xs bg-zinc-800/60 px-1 rounded">provider</code>:{" "}
              <code className="font-mono text-xs bg-zinc-800/60 px-1 rounded">provider: &quot;stripe&quot;</code> (webhook) vs{" "}
              <code className="font-mono text-xs bg-zinc-800/60 px-1 rounded">provider: null</code> (tracker.js).
            </Callout>
          </TabsContent>

          {/* INTEGRAÇÃO — STRIPE */}
          <TabsContent value="integration-stripe" className="mt-0 space-y-6">
            <SectionHeader title="Integração Stripe" badge="automático" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Conecte sua conta do Stripe com uma Restricted Key. O Groware importa o histórico completo e passa a receber eventos em tempo real via webhook — sem nenhuma linha de código adicional.
            </p>

            <SubSection title="Como conectar — passo a passo">
              <div className="space-y-2">
                {[
                  ["1. Criar Restricted Key", "Stripe Dashboard → Developers → API Keys → Restricted Keys → Create restricted key. Marque Read em: Customers, Subscriptions, Invoices, Charges, Balance transactions."],
                  ["2. Conectar no Groware", "Configurações → Integrações → Stripe. Cole a Restricted Key (rk_live_...) e clique em Conectar."],
                  ["3. Importar histórico", "Após conectar, clique em Importar histórico para trazer assinaturas e pagamentos anteriores."],
                  ["4. Configurar webhook", "Stripe Dashboard → Developers → Webhooks → Add endpoint. Cole a URL gerada pelo Groware. Copie o Signing Secret e cole no campo Webhook Secret."],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-3 rounded-lg border border-zinc-800/60 px-4 py-3">
                    <IconArrowRight size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Eventos capturados via webhook">
              <div className="rounded-lg border border-zinc-800/60 overflow-hidden">
                <div className="grid grid-cols-3 text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60">
                  <span>Evento Stripe</span>
                  <span>Tipo no Groware</span>
                  <span>Dashboard afetado</span>
                </div>
                {[
                  ["invoice.payment_succeeded (com sub)", "purchase · recurring", "Recorrência"],
                  ["invoice.payment_succeeded (sem sub)", "purchase · one_time", "Financeiro"],
                  ["payment_intent.succeeded", "purchase · one_time", "Financeiro"],
                  ["charge.refunded", "refund", "Financeiro (P&L)"],
                  ["customer.subscription.created", "subscriptions table", "Recorrência"],
                  ["customer.subscription.deleted", "subscription_canceled", "Recorrência (Churn)"],
                  ["customer.subscription.updated", "subscription_changed", "Recorrência (MRR)"],
                  ["invoice.payment_failed", "status: past_due", "Recorrência (Inadimplência)"],
                ].map(([event, type, dash]) => (
                  <div key={event} className="grid grid-cols-3 text-sm px-4 py-2.5 border-b border-zinc-800/40 last:border-0">
                    <code className="font-mono text-xs text-indigo-400">{event}</code>
                    <span className="text-xs text-zinc-400">{type}</span>
                    <span className="text-xs text-zinc-500">{dash}</span>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="O que NÃO é coberto pelo Stripe">
              <div className="space-y-1.5">
                {[
                  "Pageviews e cliques no site — use o tracker.js",
                  "Origem do cliente (UTMs, referrer, landing page) — use o tracker.js",
                  "Eventos do funil antes do pagamento — use o tracker.js",
                  "Gateways de pagamento que não sejam Stripe — use o tracker.js",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2 text-xs text-zinc-500">
                    <IconX size={11} className="text-zinc-600 shrink-0" />
                    {item}
                  </p>
                ))}
              </div>
            </SubSection>

            <Callout type="info">
              A Restricted Key é somente leitura — o Groware nunca modifica dados na sua conta Stripe.
              Ela é armazenada criptografada (AES-256-GCM) e nunca é exposta no frontend.
            </Callout>
          </TabsContent>

          {/* INTEGRAÇÃO — USANDO OS DOIS JUNTOS */}
          <TabsContent value="integration-together" className="mt-0 space-y-6">
            <SectionHeader title="Usando os dois juntos" badge="cenário ideal" />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Quando você usa o tracker.js e o Stripe ao mesmo tempo, o Groware consegue ligar automaticamente cada pagamento ao histórico de navegação do cliente — de qual canal ele veio, qual landing page visitou, qual campanha gerou a venda.
            </p>

            <SubSection title="O customer_id é a ponte">
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                O tracker.js salva <Mono>customer_id</Mono> em eventos como{" "}
                <Mono>signup</Mono> e <Mono>checkout_started</Mono>. Quando o webhook do Stripe chega,
                o Groware busca esse hash na tabela de eventos e recupera o contexto de aquisição original.
              </p>
              <CodeBlock code={STRIPE_TOGETHER_FLOW} lang="js" title="Fluxo completo de uma venda" />
            </SubSection>

            <SubSection title="Passando customer_id no Stripe Checkout">
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Para que o Groware consiga fazer o lookup, passe o <Mono>customer_id</Mono> no{" "}
                <Mono>metadata</Mono> da sessão do Stripe. Use o mesmo hash anônimo que você passa no tracker.js.
              </p>
              <CodeBlock code={STRIPE_METADATA_CODE} lang="ts" title="Backend — criando sessão do Stripe" />
            </SubSection>

            <SubSection title="Instrução mínima para integração completa">
              <div className="space-y-2">
                {[
                  ["1. Instale o tracker.js no seu site", "Captura a origem do cliente (UTMs, referrer, landing page)"],
                  ["2. Passe customer_id no checkout_started e no metadata do Stripe", "Cria a ponte entre o comportamento pré-venda e o pagamento"],
                  ["3. Conecte o Stripe no Groware", "Recebe pagamentos, renovações e cancelamentos automaticamente"],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-3 rounded-lg border border-zinc-800/60 px-4 py-3">
                    <IconCheck size={13} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <Callout type="info">
              <strong>O único caso que não funciona:</strong> o cliente paga sem nunca ter disparado nenhum evento via tracker.js. Nesse caso o pagamento é registrado com{" "}
              <Mono>source: null</Mono> e aparece como &quot;Direto&quot; no dashboard de canais. Isso é o comportamento correto — se o tracker.js não estava instalado quando o usuário chegou, genuinamente não há como saber a origem.
            </Callout>
          </TabsContent>

        </div>
      </div>
    </Tabs>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavItem({
  item,
  active,
  onSelect,
}: {
  item: { value: string; label: string; icon?: React.ElementType };
  active: string;
  onSelect: (v: string) => void;
}) {
  const isActive = active === item.value;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.value)}
      className={cn(
        "w-full flex items-center justify-start text-[13px] px-2.5 py-2 rounded-md transition-all text-left",
        isActive
          ? "bg-zinc-800/80 text-zinc-100 font-medium"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 font-normal"
      )}
    >
      {item.label}
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
      )}
    </button>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <h2 className="text-xl font-bold tracking-tight text-zinc-100">{title}</h2>
      {badge && (
        <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-zinc-500 py-0">
          {badge}
        </Badge>
      )}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn("font-mono text-xs bg-zinc-800/80 border border-zinc-700/50 px-1.5 py-0.5 rounded text-zinc-300", className)}>
      {children}
    </code>
  );
}

function AttrTable({
  rows,
}: {
  rows: { name: string; required: string; desc: string; example: string }[];
}) {
  return (
    <div className="rounded-lg border border-zinc-800/60 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
            {["Atributo", "Obrigatório", "Descrição / Exemplo"].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-zinc-800/40 last:border-0 hover:bg-zinc-900/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-indigo-400">{row.name}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">{row.required}</td>
              <td className="px-4 py-3 text-xs text-zinc-400">
                {row.desc}
                {row.example && (
                  <code className="ml-1.5 font-mono text-[11px] bg-zinc-800/80 px-1.5 py-0.5 rounded text-green-400">
                    {row.example}
                  </code>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}