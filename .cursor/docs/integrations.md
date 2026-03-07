# Groware — Arquitetura de Integrações com Gateways

> Este documento descreve o padrão de integração implementado com Stripe e Asaas.
> Deve ser usado como referência para integrar novos providers: Kiwify, Hotmart, Mercado Pago, etc.

---

## Status por Provider

| Provider | Status | Connect Action | Sync Histórico | Webhook | UI |
| -------- | ------ | -------------- | -------------- | ------- | -- |
| **Stripe** | ✅ Implementado | `connect-stripe.action.ts` | `sync-stripe-history.action.ts` | `/api/webhooks/stripe/[id]` | `stripe-connect-card.tsx` |
| **Asaas** | ✅ Implementado | `connect-asaas.action.ts` | `sync-asaas-history.action.ts` | `/api/webhooks/asaas/[id]` | `asaas-connect-card.tsx` |
| Kiwify | 🔜 Em breve | — | — | — | coming-soon |
| Hotmart | 🔜 Em breve | — | — | — | coming-soon |

---

## Visão Geral

O Groware suporta dois modos de receber dados financeiros:

| Modo                       | Como funciona                                 | Melhor para                                 |
| -------------------------- | --------------------------------------------- | ------------------------------------------- |
| **Tracker.js**             | Script no browser dispara eventos manualmente | Contexto de aquisição (UTMs, source, funil) |
| **Integração com Gateway** | Restricted Key + Webhook automatiza tudo      | Pagamentos, assinaturas, renovações, churn  |

Os dois modos são complementares e podem — e devem — ser usados juntos.

---

## O Problema de Atribuição

O maior desafio de integrar com um gateway externo é **vincular o pagamento ao contexto de aquisição** do usuário.

```
Tracker.js sabe:                    Gateway sabe:
├── source: "google"                ├── gross_value: 79.90
├── landing_page: "/pricing"        ├── customer: "cus_stripe_xyz"
├── session_id: "s_abc"             ├── subscription: "sub_abc"
└── customer_id: "hash_xyz"         └── status: "paid"
                                    ... mas não sabe a origem
```

Sem uma ponte entre os dois, o relatório de Canais fica cego para receita gerada via gateway.

### A Solução — Lookup Reverso na Events Table

Quando o webhook chega com o `customer_id`, o Groware busca o contexto de aquisição diretamente na `events table`, onde o tracker.js já salvou tudo:

```
Webhook chega → customer_id: "hash_xyz"
                      ↓
         Busca na events table:
         WHERE customer_id = "hash_xyz"
         AND source IS NOT NULL
         ORDER BY created_at ASC
         LIMIT 1
                      ↓
         Encontra: source: "google" · landing: "/pricing"
                      ↓
         Salva payment com contexto completo
```

Isso elimina a necessidade de passar contexto via metadata do gateway — o cliente só precisa garantir que o `customer_id` seja o mesmo nos dois sistemas.

---

## O customer_id — A Ponte Entre os Sistemas

O `customer_id` é o único campo que precisa ser consistente entre o tracker.js e o gateway.

### Regra obrigatória

```
O customer_id passado no tracker.js deve ser o mesmo
passado nos metadados do checkout do gateway.

Ambos devem ser o hash anônimo do ID do usuário no sistema do cliente.
```

### Geração do hash

```typescript
// lib/hash.ts
import { createHash } from "crypto";

export function hashAnonymous(id: string): string {
  return createHash("sha256")
    .update(id + process.env.CUSTOMER_HASH_SALT!)
    .digest("hex")
    .slice(0, 32);
}

// Uso
hashAnonymous(user.id); // → "a3f8c2d1e4b5..."
```

### No tracker.js (browser)

```javascript
window.Groware.track("signup", {
  customer_id: hashAnonymous(user.id), // ← hash do ID interno
});

window.Groware.track("checkout_started", {
  customer_id: hashAnonymous(user.id),
  gross_value: 79.9,
  currency: "BRL",
});
```

### No checkout do gateway (backend)

```typescript
// Stripe
stripe.checkout.sessions.create({
  metadata: {
    groware_customer_id: hashAnonymous(user.id), // ← mesmo hash
  },
});

// Asaas (futuramente)
asaas.payments.create({
  externalReference: hashAnonymous(user.id), // ← mesmo hash
});

// Kiwify, Hotmart, etc.
// Cada gateway tem um campo diferente — ver seção de cada provider
```

---

## Arquitetura da Integração — Padrão

Todo provider segue a mesma estrutura de 4 componentes:

```
1. Tabela integrations     → armazena credenciais criptografadas
2. Action de conexão       → valida, salva, dispara sync
3. Job de sync histórico   → importa dados passados (one-time)
4. Webhook handler         → recebe eventos em tempo real
```

### 1. Tabela `integrations`

```typescript
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Enum — adicionar novo provider aqui
  provider: text("provider", {
    enum: ["stripe", "asaas", "kiwify", "hotmart"],
  }).notNull(),

  // Credencial criptografada com AES-256-GCM
  accessToken: text("access_token").notNull(),

  status: text("status", {
    enum: ["active", "error", "disconnected"],
  })
    .notNull()
    .default("active"),

  lastSyncedAt: timestamp("last_synced_at"),
  historySyncedAt: timestamp("history_synced_at"),
  syncError: text("sync_error"),

  providerAccountId: text("provider_account_id"),
  providerMeta: jsonb("provider_meta"), // webhook secret, etc.

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Constraint: unique(organization_id, provider)
// Uma integração por provider por organização
```

### 2. Action de Conexão

```typescript
// Padrão que todo provider deve seguir
export async function connectProvider(
  orgId: string,
  credentials: ProviderCredentials,
) {
  // 1. Valida se as credenciais funcionam
  const account = await validateCredentials(credentials);
  if (!account) throw new Error("Credenciais inválidas");

  // 2. Verifica permissões mínimas necessárias
  const hasPermissions = await checkPermissions(credentials);
  if (!hasPermissions) throw new Error("Permissões insuficientes");

  // 3. Salva criptografado — upsert para reconectar sem duplicar
  await db
    .insert(integrations)
    .values({
      organizationId: orgId,
      provider: "stripe", // ou "asaas", "kiwify", etc.
      accessToken: encrypt(credentials.apiKey),
      providerAccountId: account.id,
      status: "active",
      providerMeta: encrypt(
        JSON.stringify({
          webhookSecret: credentials.webhookSecret,
        }),
      ),
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: {
        accessToken: encrypt(credentials.apiKey),
        status: "active",
        syncError: null,
        updatedAt: new Date(),
      },
    });

  // 4. Dispara sync histórico em background
  triggerHistorySync(orgId, "stripe").catch(console.error);

  return { success: true };
}
```

### 3. Job de Sync Histórico

> **`event_time` para importação histórica**
>
> Ao importar pagamentos anteriores à instalação do Groware, sempre passe `event_time` com a data real do pagamento em ISO 8601. O servidor aceita datas de até **2 anos** no passado e usa esse valor como `created_at` do evento, mantendo a linha do tempo correta nos dashboards.
>
> ```typescript
> await fetch('/api/track', {
>   method: 'POST',
>   body: JSON.stringify({
>     key: process.env.GROWARE_API_KEY,
>     event_type: 'purchase',
>     event_time: payment.paid_at,      // ← data real do pagamento
>     dedupe_id: 'purchase:' + payment.id,
>     gross_value: payment.amount,
>     currency: 'BRL',
>     customer_id: hashAnonymous(payment.customerId),
>   }),
> })
> ```
>
> Se `event_time` for omitido, o servidor usa o horário atual — o que colocaria todos os eventos históricos com a data de hoje, distorcendo os gráficos de receita.

```typescript
// jobs/index.ts — dispatcher por provider
export async function triggerHistorySync(
  orgId: string,
  provider: "stripe" | "asaas" | "kiwify" | "hotmart",
) {
  switch (provider) {
    case "stripe":
      return syncStripeHistory(orgId);
    case "asaas":
      return syncAsaasHistory(orgId); // futuramente
    case "kiwify":
      return syncKiwifyHistory(orgId); // futuramente
    default:
      throw new Error(`Provider ${provider} não implementado`);
  }
}

// Estrutura padrão de cada sync
async function syncProviderHistory(orgId: string) {
  const integration = await getIntegration(orgId, "provider");

  try {
    // 1. Busca dados históricos do provider (assinaturas, pagamentos)
    // 2. Converte para o formato interno (upsertSubscription, insertPaymentEvent)
    // 3. Marca sync concluído

    await db
      .update(integrations)
      .set({ historySyncedAt: new Date(), lastSyncedAt: new Date() })
      .where(eq(integrations.id, integration.id));
  } catch (err) {
    await db
      .update(integrations)
      .set({ status: "error", syncError: String(err) })
      .where(eq(integrations.id, integration.id));
    throw err;
  }
}
```

### 4. Webhook Handler

```typescript
// app/api/webhooks/[provider]/route.ts
// Estrutura de arquivos:
// app/api/webhooks/stripe/route.ts
// app/api/webhooks/asaas/route.ts    ← futuramente
// app/api/webhooks/kiwify/route.ts   ← futuramente

export async function POST(req: NextRequest) {
  // 1. Valida assinatura do webhook
  // 2. Identifica a organização
  // 3. Roteia para o handler correto
  // 4. Retorna 200 imediatamente

  return new NextResponse(null, { status: 200 });
}
```

---

## Classificação de Eventos

Todo evento recebido via webhook precisa ser classificado antes de ser salvo:

```typescript
function classifyPayment(rawEvent: ProviderEvent): PaymentClassification {
  return {
    // Financeiro vs Recorrência
    billingType: rawEvent.subscriptionId ? "recurring" : "one_time",

    // Onde vai aparecer no dashboard
    // recurring  → tela de Recorrência + Financeiro
    // one_time   → tela de Financeiro apenas

    // Tipo de evento de recorrência
    eventType: determineEventType(rawEvent),
    // "purchase"               → renovação ou primeiro pagamento
    // "subscription_canceled"  → cancelamento
    // "subscription_changed"   → upgrade ou downgrade
  };
}
```

### Mapeamento de status por provider

Cada provider usa nomes diferentes para os mesmos estados:

| Estado Groware | Stripe     | Asaas       | Kiwify     | Hotmart      |
| --------------- | ---------- | ----------- | ---------- | ------------ |
| `active`        | `active`   | `ACTIVE`    | `active`   | `APPROVED`   |
| `canceled`      | `canceled` | `CANCELLED` | `canceled` | `CANCELLED`  |
| `past_due`      | `past_due` | `OVERDUE`   | `past_due` | `CHARGEBACK` |
| `trialing`      | `trialing` | —           | `trial`    | —            |

```typescript
// Cada provider implementa seu próprio mapper
function mapStripeStatus(status: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    unpaid: "past_due",
  };
  return map[status] ?? "active";
}

// function mapAsaasStatus(status: string): SubscriptionStatus { ... }
// function mapKiwifyStatus(status: string): SubscriptionStatus { ... }
```

---

## Lookup Reverso — Implementação

```typescript
// lib/integrations/context-lookup.ts

export async function getAcquisitionContext(
  orgId: string,
  customerId: string,
): Promise<AcquisitionContext | null> {
  // Busca o primeiro evento com esse customer_id que tenha source
  const originEvent = await db
    .select({
      source: events.source,
      medium: events.medium,
      campaign: events.campaign,
      landingPage: events.landingPage,
      sessionId: events.sessionId,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, orgId),
        eq(events.customerId, customerId),
        isNotNull(events.source),
      ),
    )
    .orderBy(asc(events.createdAt))
    .limit(1)
    .then((r) => r[0] ?? null);

  return originEvent;
}

// Uso em qualquer webhook handler
async function handlePayment(orgId: string, customerId: string, payment: any) {
  const context = await getAcquisitionContext(orgId, customerId);

  await db.insert(events).values({
    ...payment,
    source: context?.source,
    medium: context?.medium,
    campaign: context?.campaign,
    landingPage: context?.landingPage,
    sessionId: context?.sessionId,
  });
}
```

---

## Deduplicação

Todo evento inserido via webhook deve ser idempotente. O Stripe (e outros providers) podem reenviar o mesmo evento mais de uma vez:

```typescript
// Usar o ID do evento do provider como chave de deduplicação
await db.insert(events).values({
  ...eventData,
  providerEventId: stripeEvent.id, // "evt_stripe_xxx"
}).onConflictDoNothing()           // ignora se já existe

// Schema — adicionar coluna
providerEventId: text("provider_event_id"), // unique index
```

---

## Quando o Tracker.js Não Está Instalado

Se o cliente conectou o gateway mas não instalou o tracker.js, os eventos chegam sem contexto de aquisição:

```
payment via webhook
├── gross_value: R$ 79,90   ✅
├── subscription_id: sub_x  ✅
├── customer_id: hash_xyz   ✅ (se passou no metadata)
├── source: null             ⚠️ aparece como "Direto" no dashboard
└── landing_page: null       ⚠️ sem atribuição de página
```

**Isso é correto** — se o tracker.js não estava instalado quando o usuário chegou, a origem genuinamente não é conhecida. O dashboard mostra como "Direto".

O cliente pode resolver instalando o tracker.js agora — novos clientes terão atribuição completa, histórico permanece sem source.

---

## Estrutura de Arquivos — Padrão

```
app/api/webhooks/
├── stripe/[integrationId]/route.ts  ✅ implementado
├── asaas/[integrationId]/route.ts   ✅ implementado
├── kiwify/route.ts                  ← futuramente
└── hotmart/route.ts                 ← futuramente

actions/integrations/
├── connect-stripe.action.ts         ✅ implementado
├── connect-asaas.action.ts          ✅ implementado
├── sync-stripe-history.action.ts    ✅ implementado
├── sync-asaas-history.action.ts     ✅ implementado
├── disconnect-integration.action.ts ✅ genérico, funciona para todos
├── save-webhook-secret.action.ts    ✅ genérico, funciona para todos
└── get-integrations.action.ts       ✅ retorna todos os providers

utils/
├── stripe-helpers.ts                ✅ stripeEventHash, mapBillingInterval
├── asaas-helpers.ts                 ✅ asaasEventHash, status mappers
├── acquisition-lookup.ts            ✅ lookup reverso na events table
├── insert-payment.ts                ✅ upsert payment com dedup
├── crypto.ts → lib/crypto.ts        ✅ encrypt/decrypt AES-256-GCM
└── hash.ts → lib/hash.ts            ✅ hashAnonymous(id)

hooks/mutations/
├── use-connect-stripe.ts            ✅
├── use-connect-asaas.ts             ✅
├── use-sync-stripe-history.ts       ✅
├── use-sync-asaas-history.ts        ✅
└── use-disconnect-integration.ts    ✅

UI (settings/integrations/)
├── stripe-connect-card.tsx          ✅
├── asaas-connect-card.tsx           ✅
├── webhook-instructions.tsx         ✅ (Stripe)
├── asaas-webhook-instructions.tsx   ✅ (Asaas)
├── coming-soon-providers.tsx        ✅ (Kiwify, Hotmart)
└── integration-status-badge.tsx     ✅

db/schema/
└── integration.schema.ts            ✅ provider enum: ["stripe", "asaas"]
```

---

## Checklist para Novo Provider

Ao implementar um novo gateway (ex: Kiwify), seguir esta ordem:

```
Schema
[x] Adicionar provider ao enum na tabela integrations   ← Asaas ✅

Credenciais
[x] Entender o modelo de autenticação do provider
    Stripe   → Restricted Key (read-only)
    Asaas    → API Key ($aact_...) + webhook access token  ← ✅
    Kiwify   → API Key
    Hotmart  → Bearer token
[x] Implementar a criptografia das credenciais          ← Asaas ✅

Action de conexão
[x] actions/integrations/connect-asaas.action.ts        ← ✅
[x] Validar credenciais via GET /v3/myAccount           ← ✅
[x] Disparar sync histórico ao conectar                 ← ✅

Sync histórico
[x] actions/integrations/sync-asaas-history.action.ts  ← ✅
[x] Mapear assinaturas para tabela subscriptions        ← ✅
[x] Mapear pagamentos para tabela events                ← ✅
[x] Paginação offset-based                              ← ✅

Webhook handler
[x] app/api/webhooks/asaas/[integrationId]/route.ts    ← ✅
[x] Validar asaas-access-token header                   ← ✅
[x] Mapear 6 eventos Asaas para eventos Groware         ← ✅
[x] Deduplicação via asaasEventHash                     ← ✅
[x] Lookup reverso de contexto de aquisição             ← ✅

Status mapper
[x] utils/asaas-helpers.ts                              ← ✅
[x] mapAsaasPaymentStatus, mapAsaasSubscriptionStatus   ← ✅

UI
[x] asaas-connect-card.tsx                              ← ✅
[x] asaas-webhook-instructions.tsx                      ← ✅
[x] Removido do coming-soon-providers                   ← ✅

i18n
[x] messages/pt/settings.json — asaas + asaasWebhook   ← ✅
[x] messages/en/settings.json — asaas + asaasWebhook   ← ✅
```

---

## Campos de Metadata Obrigatórios no Checkout

O cliente deve passar nos metadados do checkout de qualquer gateway:

| Campo                  | Obrigatório | Descrição                                         |
| ---------------------- | ----------- | ------------------------------------------------- |
| `groware_customer_id` | **Sim**     | Hash anônimo do ID do usuário — chave da linkagem |

Com só esse campo, o Groware resolve o contexto de aquisição via lookup reverso na events table.

### Por provider

```typescript
// Stripe
stripe.checkout.sessions.create({
  metadata: { groware_customer_id: hashAnonymous(user.id) },
});

// Asaas (futuramente)
asaas.payments.create({
  externalReference: hashAnonymous(user.id),
});

// Kiwify (futuramente)
// Verificar campo de metadata disponível na API

// Hotmart (futuramente)
// Verificar campo de metadata disponível na API
```

---

## Fluxo Completo — Do Clique ao Dashboard

```
1. Usuário chega via Google Ads (/pricing?utm_source=google&utm_campaign=black-friday)
   events table: pageview · source: google · campaign: black-friday · session: s_abc

2. Usuário cria conta
   events table: signup · customer_id: hash_xyz · source: google

3. Usuário clica em "Assinar"
   events table: checkout_started · customer_id: hash_xyz · gross_value: 79.90

4. Backend cria checkout no Stripe com metadata:
   { groware_customer_id: "hash_xyz" }

5. Usuário paga no Stripe

6. Stripe dispara webhook → Groware recebe

7. Groware:
   a. Extrai customer_id: "hash_xyz" do metadata
   b. Busca contexto na events table (lookup reverso)
   c. Encontra: source: google · campaign: black-friday · landing: /pricing
   d. Salva evento payment com contexto completo

8. Dashboard de Canais:
   Google Ads / black-friday → R$ 79,90 receita gerada ✅

9. Mês seguinte — renovação automática via webhook:
   source: null ← correto, renovação não tem canal
   customer_id: hash_xyz ← LTV acumulado atualizado ✅
```

---

## Variáveis de Ambiente

```bash
# Criptografia das credenciais dos clientes
ENCRYPTION_KEY=64_chars_hex_gerado_com_node_crypto

# Salt para hash anônimo dos customer_ids
# NUNCA alterar após ter dados em produção
CUSTOMER_HASH_SALT=outro_valor_secreto_diferente

# Desenvolvimento local
STRIPE_WEBHOOK_SECRET=whsec_xxx  # gerado pelo stripe listen
```

---

## Asaas — Especificidades

### 1. Autenticação

A API Key do Asaas começa com `$aact_` e dá acesso total à conta (sem Restricted Key com permissões granulares como no Stripe).

**Validação:** `GET https://api.asaas.com/v3/myAccount` com header `access_token: <apiKey>`

### 2. Webhook — Validação por Access Token

Diferente do Stripe (HMAC signature), o Asaas usa comparação de string simples. O cliente define um Access Token no painel do Asaas e o Asaas envia esse mesmo token no header `asaas-access-token` em cada requisição.

```typescript
const token = req.headers.get("asaas-access-token");
const expectedToken = decrypt(integration.providerMeta.webhookSecret);
if (token !== expectedToken) return new NextResponse("Invalid access token", { status: 401 });
```

### 3. Valores em Reais (não centavos)

O Asaas envia `value` e `netValue` em reais decimais (ex: `79.90`). Converter sempre antes de salvar:

```typescript
const grossValueInCents = Math.round(payment.value * 100);   // 79.90 → 7990
const netValueInCents   = Math.round(payment.netValue * 100); // 76.30 → 7630
```

O `netValue` é um bônus nativo do Asaas — o Stripe não fornece isso diretamente. Salvo em `baseNetValueInCents`.

### 4. Recorrência — via `payment.subscription`

O Asaas não tem `billing_reason` como o Stripe. Para determinar se um pagamento é recorrente:

```typescript
const isRecurring = !!payment.subscription; // null → avulso, "sub_xxx" → recorrente
```

Para diferenciar primeira cobrança de renovação: qualquer pagamento com `payment.subscription` é tratado como `renewal` (simplificação adequada — a primeira cobrança via webhook já foi coberta pelo `SUBSCRIPTION_CREATED`).

### 5. Paginação Offset-based

Diferente do cursor-based do Stripe (`starting_after`), o Asaas usa `offset + limit`:

```typescript
GET /v3/payments?offset=0&limit=100
// Response: { totalCount: 350, hasMore: true, data: [...] }
GET /v3/payments?offset=100&limit=100
GET /v3/payments?offset=200&limit=100
// ...até hasMore === false
```

### 6. Mapeamento de Eventos

| Evento Asaas | Handler | Equivalente Stripe |
|---|---|---|
| `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` | `handlePaymentReceived` | `invoice.payment_succeeded` + `payment_intent.succeeded` |
| `PAYMENT_REFUNDED` | `handlePaymentRefunded` | `charge.refunded` |
| `PAYMENT_OVERDUE` | `handlePaymentOverdue` | `invoice.payment_failed` |
| `SUBSCRIPTION_CREATED` | `handleSubscriptionCreated` | `customer.subscription.created` |
| `SUBSCRIPTION_UPDATED` | `handleSubscriptionUpdated` | `customer.subscription.updated` |
| `SUBSCRIPTION_DELETED` / `SUBSCRIPTION_INACTIVATED` | `handleSubscriptionCanceled` | `customer.subscription.deleted` |

### 7. Status Mappers

```typescript
// utils/asaas-helpers.ts
function mapAsaasPaymentStatus(status: string): string {
  CONFIRMED | RECEIVED | DUNNING_RECEIVED  → "paid"
  PENDING                                   → "pending"
  OVERDUE | CHARGEBACK_* | DUNNING_REQUESTED| AWAITING_... → "past_due"
  REFUNDED | REFUND_REQUESTED               → "refunded"
}

function mapAsaasSubscriptionStatus(status: string): SubscriptionStatus {
  ACTIVE   → "active"
  INACTIVE | EXPIRED → "canceled"
}

function mapAsaasBillingInterval(cycle: string): BillingInterval {
  WEEKLY → "weekly", MONTHLY → "monthly", QUARTERLY → "quarterly"
  SEMIANNUALLY → "semiannual", YEARLY → "yearly"
}
```

### 8. externalReference — customer_id

No Asaas, o campo `externalReference` é onde o cliente passa o `groware_customer_id` (equivalente ao `metadata.groware_customer_id` do Stripe):

```typescript
// Cliente cria pagamento/assinatura no Asaas
asaas.payments.create({
  externalReference: hashAnonymous(user.id), // ← mesmo hash do tracker.js
});
```

O webhook handler extrai: `payment.externalReference ?? payment.customer`

---

_Documento atualizado em março/2026 — versão 2.0_
_Providers implementados: Stripe, Asaas_
_Próximos providers: Kiwify, Hotmart, Mercado Pago_
