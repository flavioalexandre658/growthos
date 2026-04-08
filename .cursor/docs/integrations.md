# Groware — Arquitetura de Integrações com Gateways

> Este documento descreve o padrão de integração implementado com Stripe e Asaas.
> Deve ser usado como referência para integrar novos providers: Kiwify, Hotmart, Mercado Pago, etc.

---

## Status por Provider

| Provider | Status | Connect Action | Sync Histórico | Webhook | UI |
| -------- | ------ | -------------- | -------------- | ------- | -- |
| **Stripe** | ✅ Implementado | `connect-stripe.action.ts` | `sync-stripe-history.action.ts` | `/api/webhooks/stripe/[id]` | drawer config no `page.tsx` |
| **Asaas** | ✅ Implementado | `connect-asaas.action.ts` | `sync-asaas-history.action.ts` | `/api/webhooks/asaas/[id]` | drawer config no `page.tsx` |
| **Kiwify** | ✅ Implementado | `connect-kiwify.action.ts` | `sync-kiwify-history.action.ts` | `/api/webhooks/kiwify/[id]` | drawer config no `page.tsx` |
| **Hotmart** | ✅ Implementado | `connect-hotmart.action.ts` | `sync-hotmart-history.action.ts` | `/api/webhooks/hotmart/[id]` | drawer config no `page.tsx` |
| **Mercado Pago** | ✅ Implementado | `connect-mercadopago.action.ts` | `sync-mercadopago-history.action.ts` | `/api/webhooks/mercadopago/[id]` | drawer config no `page.tsx` |
| **Pagar.me** | ✅ Implementado | `connect-pagarme.action.ts` | `sync-pagarme-history.action.ts` | `/api/webhooks/pagarme/[id]` | drawer config no `page.tsx` |

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

Use o ID raw do usuário no sistema do cliente (UUID ou string de identificação única).
Não é necessário aplicar hash — IDs internos de usuário não contêm dados pessoais sensíveis.
```

### No tracker.js (browser)

```javascript
// Identifique o usuário assim que ele fizer login
// Isso enriquece todos os eventos subsequentes com PII
window.Groware.identify(user.id, {
  name: user.name,
  email: user.email,
  phone: user.phone, // opcional
});

// Após identify(), os campos de PII são incluídos automaticamente
// em todos os eventos — não é necessário passar customer_id manualmente
window.Groware.track("checkout_started", {
  gross_value: 79.9,
  currency: "BRL",
});

// Para limpar a identidade (ex.: logout)
window.Groware.reset();

// Também é possível passar customer_id diretamente nos eventos
// (se identify() não foi chamado)
window.Groware.track("signup", {
  customer_id: user.id, // ← ID interno do usuário (UUID)
  customer_name: user.name, // opcional
  customer_email: user.email, // opcional
  customer_phone: user.phone, // opcional
});
```

### No checkout do gateway (backend)

```typescript
// Stripe — passar no metadata da Checkout Session
stripe.checkout.sessions.create({
  metadata: {
    growthos_customer_id: user.id, // ← mesmo ID do tracker
  },
  // Opcional: propagar para o PaymentIntent também
  payment_intent_data: {
    metadata: {
      growthos_customer_id: user.id,
    },
  },
});

// Asaas — usar externalReference
asaas.payments.create({
  externalReference: user.id, // ← mesmo ID do tracker
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
>     customer_id: payment.customerId,
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
└── hash.ts → lib/hash.ts            ✅ crypto utils

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

## Coleta de PII do Cliente (Customer Enrichment)

O Groware agora suporta coleta opcional de dados de identificação do cliente (PII) para enriquecer a tabela `customers`.

### Campos PII Suportados

| Campo             | Onde enviar              | Descrição                  |
| ----------------- | ------------------------ | -------------------------- |
| `customer_name`   | Track API / identify()   | Nome completo do cliente   |
| `customer_email`  | Track API / identify()   | Email do cliente           |
| `customer_phone`  | Track API / identify()   | Telefone do cliente        |

### Armazenamento

Os campos PII (`name`, `email`, `phone`) são armazenados como texto simples na tabela `customers`. O acesso é controlado pela autenticação da aplicação.

### Via Tracker.js — `Groware.identify()`

O método `identify()` é a forma recomendada de associar PII a um usuário no browser:

```javascript
// Chamar após login do usuário
window.Groware.identify(user.id, {
  name: user.name,         // opcional
  email: user.email,       // opcional
  phone: user.phone,       // opcional
});

// Após identify(), todos os eventos incluem os campos PII automaticamente
// Não é necessário repeti-los em cada evento

// Limpar identidade no logout
window.Groware.reset();
```

Os dados são armazenados no `sessionStorage` como `groware_customer` e enviados automaticamente com cada evento (pageview, signup, checkout_started, etc.).

### Via Track API — campos diretos no payload

```javascript
await fetch('/api/track', {
  method: 'POST',
  body: JSON.stringify({
    key: process.env.GROWARE_API_KEY,
    event_type: 'signup',
    customer_id: user.id,
    customer_name: user.name,    // opcional
    customer_email: user.email,  // opcional
    customer_phone: user.phone,  // opcional
  }),
});
```

### Via Stripe — automático

O Groware extrai automaticamente PII dos objetos Stripe:

| Evento Stripe                  | Campos extraídos                           |
| ------------------------------ | ------------------------------------------ |
| `checkout.session.completed`   | `customer_details.name/email/phone`        |
| `invoice.payment_succeeded`    | `customer_name`, `customer_email`          |
| `charge.refunded`              | `billing_details.name/email/phone`         |
| `payment_intent.succeeded`     | `latest_charge.billing_details.name/email/phone` |

Nenhuma configuração adicional necessária — os dados chegam automaticamente via webhook.

### Via Asaas — chamada à API

Quando um evento Asaas chega, o Groware faz automaticamente uma chamada a `GET /api/v3/customers/{id}` para buscar `name`, `email` e `phone` do cliente. Os dados são cacheados por organização durante o sync histórico.

### Tabela `customers`

```typescript
// Schema da tabela customers (db/schema/customer.schema.ts)
{
  id: uuid,
  organizationId: uuid,
  customerId: text,         // ID do usuário no sistema do cliente
  name: text,               // plaintext
  email: text,              // plaintext
  phone: text,              // plaintext
  country: text,            // ISO 3166-1 alpha-2 (via Vercel geo headers)
  region: text,             // Código de estado/região
  city: text,               // Nome da cidade
  avatarUrl: text,          // URL do avatar (future use)
  metadata: jsonb,          // Campos extras extensíveis
  firstSeenAt: timestamp,   // Primeiro evento registrado
  lastSeenAt: timestamp,    // Último evento (atualizado a cada evento)
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### Geo-IP automático (via Vercel)

O IP do visitante é usado para preencher `country`, `region` e `city` automaticamente via headers do Vercel (`x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`). Em desenvolvimento local, esses campos ficam nulos.

---

## Campos de Metadata Obrigatórios no Checkout

O cliente deve passar nos metadados do checkout de qualquer gateway:

| Campo                  | Obrigatório | Descrição                                         |
| ---------------------- | ----------- | ------------------------------------------------- |
| `growthos_customer_id` | **Sim**     | ID do usuário no sistema do cliente — chave da linkagem |

Com só esse campo, o Groware resolve o contexto de aquisição via lookup reverso na events table.

### Por provider

```typescript
// Stripe — metadata na Checkout Session
stripe.checkout.sessions.create({
  metadata: { growthos_customer_id: user.id },
  // OBRIGATÓRIO para assinaturas: propagar para subscription e invoices
  // Sem isso, o sync histórico lê metadata vazio nas invoices e cai no fallback cus_xxx
  subscription_data: {
    metadata: { growthos_customer_id: user.id },
  },
  // Para mode: 'payment' (compra avulsa):
  payment_intent_data: {
    metadata: { growthos_customer_id: user.id },
  },
});

// Asaas — externalReference
asaas.payments.create({
  externalReference: user.id,
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
   events table: signup · customer_id: user_uuid · source: google

3. Usuário clica em "Assinar"
   events table: checkout_started · customer_id: user_uuid · gross_value: 79.90

4. Backend cria checkout no Stripe com metadata:
   { growthos_customer_id: "user_uuid" }

5. Usuário paga no Stripe

6. Stripe dispara webhook → Groware recebe

7. Groware:
   a. Extrai customer_id: "user_uuid" do metadata
   b. Busca contexto na events table (lookup reverso)
   c. Encontra: source: google · campaign: black-friday · landing: /pricing
   d. Salva evento payment com contexto completo

8. Dashboard de Canais:
   Google Ads / black-friday → R$ 79,90 receita gerada ✅

9. Mês seguinte — renovação automática via webhook:
   source: null ← correto, renovação não tem canal
   customer_id: user_uuid ← LTV acumulado atualizado ✅
```

---

## Variáveis de Ambiente

```bash
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

No Asaas, o campo `externalReference` é onde o cliente passa o `growthos_customer_id` (equivalente ao `metadata.growthos_customer_id` do Stripe):

```typescript
// Cliente cria pagamento/assinatura no Asaas
asaas.payments.create({
  externalReference: user.id, // ← mesmo ID do tracker.js
});
```

O webhook handler extrai: `payment.externalReference ?? payment.customer`

---

---

## Kiwify — Especificidades

### 1. Autenticação — OAuth2 Client Credentials

Diferente de Stripe (Restricted Key) e Asaas (API Key fixa), o Kiwify usa **OAuth2 client credentials** retornando um JWT Bearer com TTL de ~24h.

**Credenciais que o cliente fornece:**
- `client_id`
- `client_secret`
- `account_id` (segundo identificador, exigido como header em toda chamada da API)

**Token endpoint:** `POST https://public-api.kiwify.com/v1/oauth/token` com body `application/x-www-form-urlencoded`:

```
client_id=<id>&client_secret=<secret>
```

**Headers nas chamadas autenticadas:**

```
Authorization: Bearer <access_token>
x-kiwify-account-id: <accountId>
```

**Validação no connect:** `GET /v1/account` (smoke test que confirma credenciais + account_id juntos).

O OAuth token é cacheado em `providerMeta.oauthAccessToken` (encriptado) com `providerMeta.oauthTokenExpiresAt` em epoch ms. O helper compartilhado `utils/oauth-token-cache.ts` faz refresh automático com margem de 5 minutos.

### 2. Webhook — Validação por shared token

O Kiwify usa **shared token**, não HMAC. Quando o cliente cria o webhook no painel, ele define um campo `token`. Esse mesmo token é enviado em cada delivery — o handler aceita o token via:

1. Query param `?token=...`
2. Header `x-kiwify-token` / `kiwify-token` / `x-kiwify-signature`
3. Campo `token` no body

(A documentação oficial não especifica claramente o canal — o handler tenta os três para máxima compatibilidade.)

### 3. Sem endpoint de subscriptions list

A API pública do Kiwify **não tem** endpoint `/v1/subscriptions` para listar assinaturas. O sync histórico só importa **vendas** via `GET /v1/sales`. Estado vigente de assinaturas é mantido a partir dos webhooks (`subscription_renewed`, `subscription_canceled`, `subscription_late`) e do primeiro sale recorrente.

### 4. Janela de sales = 90 dias

`GET /v1/sales` exige `start_date` e `end_date` e limita a janela a **90 dias por request**. O worker faz um loop de janelas de 90 dias retrocedendo até 2 anos (regra de `event_time` do `/api/track`).

### 5. Paginação offset-based

```
GET /v1/sales?start_date=2025-01-01&end_date=2025-03-31&page_number=1&page_size=100
```

O loop incrementa `page_number` até receber menos que `PAGE_SIZE` items.

### 6. Valores em cents (integer)

Diferente do Asaas (decimais), o Kiwify entrega `charge_amount` em **cents inteiros** (ex: `9700` = R$ 97,00). Não dividir/multiplicar.

### 7. Ponte de customer_id via UTM

O Kiwify não tem campo `metadata` ou `external_reference` nativo. Padrão recomendado:

```
https://pay.kiwify.com.br/checkout/abc?utm_content=gos_<user_id>
```

O handler extrai via `TrackingParameters.utm_content` e remove o prefixo `gos_`. Se não houver, fallback para `Customer.email` normalizado.

### 8. Mapeamento de eventos

| Evento Kiwify | Handler interno | Equivalente Stripe |
|---|---|---|
| `compra_aprovada` | `handleKiwifyPurchase` | `checkout.session.completed` / `payment_intent.succeeded` |
| `subscription_renewed` | `handleKiwifyPurchase(force_recurring=true)` | `invoice.payment_succeeded` |
| `compra_reembolsada` | `handleKiwifyRefund` | `charge.refunded` |
| `chargeback` | `handleKiwifyRefund` | `charge.refunded` |
| `subscription_canceled` | `handleKiwifySubscriptionCanceled` | `customer.subscription.deleted` |
| `subscription_late` | `handleKiwifySubscriptionPastDue` | `invoice.payment_failed` |

---

## Hotmart — Especificidades

### 1. Autenticação — OAuth2 Client Credentials + Basic header

O Hotmart também usa OAuth2 client credentials, mas o token endpoint exige um header `Authorization: Basic <base64(client_id:client_secret)>` adicional.

**Credenciais que o cliente fornece:**
- `client_id`
- `client_secret`

O `basic_token` (Base64) é **derivado server-side** pelo Groware — o cliente não precisa copiar separadamente, mesmo que o painel do Hotmart o exiba. Helper em `utils/hotmart-helpers.ts`:

```typescript
function hotmartBasicToken(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}
```

**Token endpoint:** `POST https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=<id>&client_secret=<secret>` com header `Authorization: Basic <basic>`.

**Validação no connect:** `GET /payments/api/v1/sales/history?max_results=1` como smoke test.

Token cacheado da mesma forma que o Kiwify (via `oauth-token-cache.ts`).

### 2. Webhook — Validação por hottok

O Hotmart usa **hottok**, gerado automaticamente pelo Hotmart por conta e exibido no painel de Webhook. O cliente copia e cola na UI do Groware. O Hotmart envia o `hottok` no body de cada webhook (campo top-level `hottok`). O handler também aceita header `x-hotmart-hottok` ou `hottok` para compatibilidade.

```typescript
const expectedHottok = decrypt(integration.providerMeta.webhookSecret);
const incomingHottok = body.hottok ?? req.headers.get("x-hotmart-hottok");
if (incomingHottok !== expectedHottok) return 401;
```

### 3. Valores em decimal — converter para cents

Diferente do Kiwify (já em cents), o Hotmart envia `purchase.price.value` como **decimal** (ex: `97.00`). O handler converte:

```typescript
const grossInCents = Math.round(value * 100);
```

### 4. Multi-currency

O Hotmart suporta vendas em USD/EUR além de BRL. O campo `purchase.price.currency_value` traz o ISO 4217 (`"BRL"`, `"USD"`). O handler usa `computeBaseValue` para converter para a moeda base da org via `resolveExchangeRate`.

### 5. Paginação cursor-based

```
GET /payments/api/v1/sales/history?max_results=50&page_token=<token>
```

A resposta traz `page_info.next_page_token`. Loop até `next_page_token` ser null.

### 6. Subscriptions list disponível

`GET /payments/api/v1/subscriptions` lista todas as assinaturas com paginação cursor-based — usado pelo worker para popular a tabela `subscriptions`.

### 7. Ponte de customer_id via sck

```
https://pay.hotmart.com/X12345?sck=gos_<user_id>
```

O webhook recebe em `data.purchase.sck`. Handler extrai e remove o prefixo `gos_`. Fallback: `data.buyer.ucode` → `data.buyer.email`.

### 8. Mapeamento de eventos

| Evento Hotmart | Handler interno | Notas |
|---|---|---|
| `PURCHASE_APPROVED` | `handleHotmartApproved` | Distingue purchase × renewal via `recurrence_number` (>1 = renovação) |
| `PURCHASE_COMPLETE` | `handleHotmartApproved` | Pós-escrow, mesmo handler |
| `PURCHASE_REFUNDED` / `PURCHASE_PROTEST` | `handleHotmartRefund` | Insere event negativo |
| `PURCHASE_CHARGEBACK` | `handleHotmartRefund` | Mesmo tratamento |
| `PURCHASE_CANCELED` | `handleHotmartCanceled` | Trata como refund |
| `PURCHASE_DELAYED` / `PURCHASE_EXPIRED` | `handleHotmartPastDue` | Atualiza subscription.status = past_due |
| `SUBSCRIPTION_CANCELLATION` | `handleHotmartSubscriptionCanceled` | **Atenção: double-L na grafia** |
| `UPDATE_SUBSCRIPTION_CHARGE_DATE` | no-op | Apenas data de próxima cobrança, sem impacto financeiro |

### 9. Status de subscription

Hotmart usa valores nativos como `ACTIVE`, `OVERDUE`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_SELLER`, `INACTIVE`, `EXPIRED`, `STARTED`. O mapper em `utils/hotmart-helpers.ts:mapHotmartSubscriptionStatus` normaliza para `active | canceled | past_due | trialing`.

### 10. Sandbox

V1 usa apenas **produção**. Para suportar sandbox no futuro, adicionar `providerMeta.environment` e ramificar URLs em `HOTMART_API_BASE` e `HOTMART_OAUTH_URL`.

---

---

## Mercado Pago — Especificidades

### 1. Autenticação — Access Token único

O Mercado Pago usa um **Access Token permanente** (`APP_USR-...` em produção ou `TEST-...` em sandbox) enviado via header `Authorization: Bearer <token>`. Diferente do Kiwify/Hotmart (OAuth client credentials), não há refresh — o token é colado direto pelo usuário no form de connect.

**Validação no connect:** `GET https://api.mercadopago.com/users/me` retorna `{ id, nickname, email, ... }`. O `providerAccountId` é a string do `id`.

### 2. Webhook — thin envelope com fetch-by-id

O Mercado Pago envia webhooks com **payload minimalista** — só `{ type, action, data: { id } }`. O handler precisa **fetch o recurso completo** pela API antes de processar:

```typescript
switch (topic) {
  case "payment":
    const payment = await fetchMercadoPagoResource<MPPayment>(`/v1/payments/${dataId}`, accessToken);
    // ...
  case "subscription_preapproval":
    const preapproval = await fetchMercadoPagoResource<MPPreapproval>(`/preapproval/${dataId}`, accessToken);
    // ...
  case "subscription_authorized_payment":
    const authorized = await fetchMercadoPagoResource<MPAuthorizedPayment>(`/authorized_payments/${dataId}`, accessToken);
    // fetch again /v1/payments/{authorized.payment.id}
}
```

O `data.id` pode vir no body ou em query params (`?data.id=xxx&type=xxx`). O handler tenta o body primeiro, cai no query como fallback.

### 3. HMAC SHA-256 manifest format

Diferente do Asaas (shared token simples) e Stripe (payload-based HMAC), o MP valida por um **manifest string** montado a partir de múltiplos campos:

```typescript
const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
```

Header enviado: `x-signature: ts=<ms>,v1=<hex>`. O `ts` e `v1` são extraídos via parse. O secret é configurado no painel "Suas Integrações" → Webhooks (campo "Chave secreta").

### 4. Valores em decimal

`transaction_amount` é decimal (ex: `79.90`). Converter com `Math.round(value * 100)` antes de persistir.

### 5. Currency multi-moeda

`currency_id` traz ISO 4217 (`BRL`, `ARS`, `USD`). O worker usa `caches.computeBaseValue` com a moeda da org.

### 6. Subscription = Preapproval

Terminologia exclusiva do MP. Status nativos: `pending`, `authorized`, `paused`, `cancelled`. Mapper em `utils/mercadopago-helpers.ts:mapMercadoPagoPreapprovalStatus`.

Endpoint de listagem: **`/preapproval/search`** (sem `/v1/` no caminho, diferente dos payments).

### 7. Paginação offset-based com cap

```
GET /v1/payments/search?range=date_created&begin_date=<ISO>&end_date=<ISO>&offset=0&limit=100
```

Hard cap conhecido: ~1000 results por query via offset. O worker mitiga fazendo **loop de janelas de 90 dias** retrocedendo até 2 anos.

### 8. Ponte de customer_id

```
checkout?external_reference=gos_<user_id>
```

O webhook handler extrai `payment.external_reference` e remove o prefixo `gos_` via `extractGrowthosCustomerId`. Fallback: `payment.payer.id` → `payer.email`.

### 9. Mapeamento de eventos

| Topic MP | Handler interno | Action |
|---|---|---|
| `payment` (status=approved) | `handleMPPayment` | Insere event/payment. Detecta recorrência via `metadata.preapproval_id`. |
| `payment` (status=refunded) | `handleMPRefund` | Event negativo. |
| `subscription_preapproval` | `handleMPPreapproval` | Upsert em `subscriptions`. Status=cancelled dispara `subscription_canceled` event. |
| `subscription_authorized_payment` | (fetch + delega para `handleMPPayment(force_recurring=true)`) | Pagamento de renovação. |

---

## Pagar.me — Especificidades

### 1. Autenticação — Basic Auth com chave única

A Pagar.me v5 usa **Basic Auth** com a Secret Key como username e senha vazia:

```
Authorization: Basic <base64(secretKey + ":")>
```

Helper em `utils/pagarme-helpers.ts:pagarmeBasicAuthHeader`. Chaves:
- `sk_live_*` — produção
- `sk_test_*` — sandbox

O `connect-pagarme.action.ts` valida o prefix e rejeita qualquer outro formato.

**Validação no connect:** não há `/me`. Smoke test em `GET /core/v5/orders?size=1` — 200 = ok, 401/403 = credencial inválida. O `providerAccountId` é derivado como `secretKey.slice(0, 16)` (pattern do Stripe).

### 2. Webhook — HMAC SHA-1 sobre raw body

Header: `X-Hub-Signature: sha1=<hex>`. O handler aceita também `X-Hub-Signature-256` (SHA-256 fallback) para futuras migrações da Pagar.me.

```typescript
const expected = createHmac("sha1", secret).update(rawBody).digest("hex");
```

Comparação via `timingSafeEqual`. O `secret` é definido pelo usuário ao criar o webhook no painel da Pagar.me.

### 3. Full resource embedded no payload

Diferente do Mercado Pago, o webhook da Pagar.me traz **o recurso completo** já embutido:

```json
{
  "id": "hook_xxx",
  "account": { "id": "acc_xxx" },
  "type": "charge.paid",
  "data": { "id": "ch_xxx", "amount": 9990, "status": "paid", ... },
  "created_at": "2026-04-08T..."
}
```

Sem necessidade de fetch extra. Dedup via `pagarmeEventHash(orgId, charge.id)`.

### 4. Cents inteiros

`amount` é integer em centavos (BRL). Formato interno do Groware — sem conversão.

### 5. Paginação page+size, max 30

```
GET /core/v5/orders?page=1&size=30
GET /core/v5/charges?page=1&size=30
GET /core/v5/subscriptions?page=1&size=30
```

Limite conhecido: `size=30` é o máximo. O worker faz loop incrementando `page` até receber array vazio. Filtro de data: `created_since=<ISO>` para re-sync incremental.

### 6. Metadata nativo

A Pagar.me suporta objeto `metadata` em Order, Charge, Customer e Subscription — tudo flui para o webhook via `data.metadata.growthos_customer_id`. O handler extrai também de `customer.metadata` como fallback.

### 7. Mapeamento de eventos

| Evento Pagar.me | Handler interno |
|---|---|
| `order.paid` / `charge.paid` | `handlePagarmePaid` (purchase) |
| `subscription.charges_paid` | `handlePagarmePaid(force_recurring=true)` (renewal) |
| `charge.refunded` / `charge.chargedback` | `handlePagarmeRefund` |
| `order.canceled` / `order.payment_failed` / `charge.payment_failed` | `handlePagarmeFailed` (marca subscription past_due se houver) |
| `subscription.created` | `handlePagarmeSubscriptionCreated` (upsert em `subscriptions`) |
| `subscription.canceled` | `handlePagarmeSubscriptionCanceled` |
| `subscription.charges_payment_failed` | `handlePagarmeSubscriptionPastDue` |

### 8. Subscription status

Status nativos: `active`, `canceled`, `future`, `expired`, `trial`, `past_due`. Mapper em `utils/pagarme-helpers.ts:mapPagarmeSubscriptionStatus` normaliza para `active | canceled | past_due | trialing`.

### 9. Billing interval

O Pagar.me expõe `interval` (`month`, `year`, `week`) + `interval_count`. Mapper: `mapPagarmeBillingInterval(interval, count)` combina os dois (ex: `month` + `count=3` → `quarterly`).

---

_Documento atualizado em abril/2026 — versão 2.2_
_Providers implementados: Stripe, Asaas, Kiwify, Hotmart, Mercado Pago, Pagar.me_
