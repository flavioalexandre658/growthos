# Groware — Arquitetura do Sistema

## Visão Geral

O Groware é uma plataforma de Growth Analytics multi-tenant que coleta dados via `tracker.js` embeddável, processa eventos em tempo real, calcula P&L com custos locais e gera análises com IA.

```
Groware
├── Tracking
│   ├── public/tracker.js     → script embeddável (browser)
│   └── /api/track            → endpoint de ingestão (server-side também)
├── Dashboard (análises de crescimento)
│   ├── Visão Geral           → funnel + KPIs + gráfico diário
│   ├── Recorrência (MRR)     → MRR, ARR, ARPU, LTV, Churn (se hasRecurringRevenue)
│   ├── Canais                → receita por canal de aquisição
│   ├── Financeiro            → receita, taxas, descontos, ticket médio
│   ├── Landing Pages         → conversão por entry_page
│   ├── Pages                 → conversão por landing_page
│   └── Custos & P&L          → custos fixos/variáveis + lucro real + IA
└── Multi-tenant
    └── Isolamento por organization_id em todas as queries
```

---

## Stack Técnica

| Camada        | Tecnologia                                  |
| ------------- | ------------------------------------------- |
| Framework     | Next.js 16 (App Router)                     |
| UI            | React 19, Tailwind CSS, shadcn/ui, Recharts |
| Auth          | NextAuth v4 (JWT + Credentials)             |
| Banco local   | NeonDB (PostgreSQL serverless)              |
| ORM           | Drizzle ORM                                 |
| IA            | Google Gemini 1.5 Flash                     |
| Data fetching | React Query v5                              |

---

## Modelo Multi-tenant

Cada organização é isolada por `organization_id`. A organização ativa é determinada pelo `slug` na URL (`/[slug]/...`).

### Fluxo de dados

```
URL (slug + searchParams) → app/[slug]/layout.tsx (valida org)
                                    ↓
                        OrganizationProvider (context)
                                    ↓
                 *Content (client) → useOrganization() → orgId
                                    ↓
                    hooks React Query → server actions → Drizzle → NeonDB
                                    ↓
                         Componentes UI renderizam
```

---

## Schema do Banco (NeonDB)

### Tabela `organizations`

| Coluna                  | Tipo        | Descrição                                        |
| ----------------------- | ----------- | ------------------------------------------------ |
| id                      | uuid PK     | ID único                                         |
| name                    | text        | Nome da empresa                                  |
| slug                    | text unique | Identificador na URL (ex: convitede)             |
| funnel_steps            | jsonb       | Etapas do funil personalizadas                   |
| has_recurring_revenue   | boolean     | Ativado automaticamente na 1ª renovação recebida |
| created_at              | timestamp   |                                                  |
| updated_at              | timestamp   |                                                  |

### Tabela `events`

| Coluna                | Tipo      | Descrição                                           |
| --------------------- | --------- | --------------------------------------------------- |
| id                    | uuid PK   |                                                     |
| organization_id       | uuid FK   | Referência para organizations                       |
| event_type            | text      | pageview, signup, purchase, subscription_canceled... |
| gross_value_in_cents  | integer   |                                                     |
| discount_in_cents     | integer   |                                                     |
| installments          | integer   |                                                     |
| payment_method        | text      |                                                     |
| product_id            | text      |                                                     |
| product_name          | text      |                                                     |
| category              | text      |                                                     |
| source                | text      | Canal inferido (google, instagram, direct...)       |
| medium                | text      |                                                     |
| campaign              | text      |                                                     |
| content               | text      |                                                     |
| landing_page          | text      | URL atual no momento do evento                      |
| entry_page            | text      | Primeira URL da sessão                              |
| referrer              | text      |                                                     |
| device                | text      | mobile / desktop                                    |
| customer_type         | text      | new / returning                                     |
| customer_id           | text      | Hash anônimo do cliente                             |
| session_id            | text      |                                                     |
| billing_type          | text      | recurring / one_time                                |
| billing_interval      | text      | monthly / yearly / weekly                           |
| subscription_id       | text      | ID único da assinatura                              |
| plan_id               | text      |                                                     |
| plan_name             | text      |                                                     |
| metadata              | jsonb     | Campos extras (max 20 chaves, strings max 500)      |
| created_at            | timestamp |                                                     |

Índices: `(organization_id, event_type, created_at)` e `(organization_id, created_at)`.

### Tabela `subscriptions`

| Coluna           | Tipo      | Descrição                                         |
| ---------------- | --------- | ------------------------------------------------- |
| id               | uuid PK   |                                                   |
| organization_id  | uuid FK   |                                                   |
| subscription_id  | text      | UNIQUE — ID no gateway (ex: sub_stripe_xxx)       |
| customer_id      | text      |                                                   |
| plan_id          | text      |                                                   |
| plan_name        | text      |                                                   |
| status           | text enum | active / canceled / past_due / trialing           |
| value_in_cents   | integer   | Valor do ciclo de cobrança                        |
| billing_interval | text enum | monthly / yearly / weekly                         |
| started_at       | timestamp |                                                   |
| canceled_at      | timestamp | nullable                                          |
| created_at       | timestamp |                                                   |
| updated_at       | timestamp |                                                   |

Índice: `(organization_id, status)`.

### Tabela `fixed_costs`

| Coluna          | Tipo      | Descrição                                     |
| --------------- | --------- | --------------------------------------------- |
| id              | uuid PK   |                                               |
| organization_id | uuid FK   |                                               |
| name            | text      | Nome do custo (ex: Aluguel)                   |
| amount_in_cents | integer   | Valor em centavos (PERCENTAGE: 1550 = 15.50%) |
| type            | text enum | VALUE ou PERCENTAGE                           |
| description     | text?     |                                               |
| created_at      | timestamp |                                               |
| updated_at      | timestamp |                                               |

### Tabela `variable_costs`

Mesma estrutura de `fixed_costs`.

### Tabela `api_keys`

| Coluna          | Tipo      | Descrição                               |
| --------------- | --------- | --------------------------------------- |
| id              | uuid PK   |                                         |
| organization_id | uuid FK   |                                         |
| key             | text      | UNIQUE — prefixo `tok_`                 |
| name            | text      |                                         |
| is_active       | boolean   |                                         |
| last_used_at    | timestamp |                                         |
| expires_at      | timestamp | nullable                                |
| created_at      | timestamp |                                         |

### Tabela `users`

| Coluna                | Tipo      | Descrição                            |
| --------------------- | --------- | ------------------------------------ |
| id                    | uuid PK   |                                      |
| name                  | text      |                                      |
| email                 | text      | UNIQUE                               |
| password_hash         | text      |                                      |
| role                  | text enum | ADMIN / VIEWER                       |
| onboarding_completed  | boolean   |                                      |
| created_at            | timestamp |                                      |
| updated_at            | timestamp |                                      |

### Convenção PERCENTAGE

Quando `type = "PERCENTAGE"`, o `amount_in_cents` armazena a porcentagem × 100:
- 15.5% → `amount_in_cents = 1550`
- 5% → `amount_in_cents = 500`

---

## Fluxo do `/api/track`

```
POST /api/track
    ↓
1. CORS (origin reflection)
2. Payload size check (64KB max)
3. Rate limit (1000 req/min por API key)
4. Validate API key (isActive + expiresAt)
5. db.insert(events) — sempre
6. Subscription upsert (condicional):
   - event_type = 'purchase' + billing_type = 'recurring'
     → upsert subscriptions (status: active)
     → se primeira vez: organizations.has_recurring_revenue = true
   - event_type = 'subscription_canceled'
     → subscriptions SET status = 'canceled', canceled_at = now()
   - event_type = 'subscription_changed'
     → subscriptions SET value_in_cents, plan_id, plan_name
7. 204 No Content
```

---

## Cálculo de P&L

Função: `utils/build-pl.ts → buildProfitAndLoss()`

```
Receita Bruta (da tabela events, em centavos)
  - Custos Variáveis calculados (VALUE direto, PERCENTAGE × receita / 10000)
  = Lucro Bruto

Receita Bruta
  - Custos Fixos calculados
  - Custos Variáveis calculados
  = Lucro Real

Margem (%) = Lucro Real / Receita Bruta × 100
```

---

## Funil Genérico

Cada organização define seus `funnelSteps` no onboarding. O `IGenericFunnelData` é o formato unificado:

```typescript
{
  steps: [{ key: string, label: string, value: number }],
  rates: [{ key: string, label: string, value: string }],
  revenue: number,
  netRevenue: number,
  ticketMedio: string,
  margin: string,
  checkoutAbandoned?: number,
}
```

Regras de injeção automática:
- `pageview` é sempre adicionado como etapa 1 se não configurado
- `checkout_started` é injetado antes de `purchase` se existirem dados
- `checkout_abandoned` aparece como KPI e coluna separada, não como etapa do funil

---

## Cálculo de MRR

Normalização para mensal:
- `monthly`: sem alteração
- `yearly`: `value / 12`
- `weekly`: `value * 4.33`

Métricas calculadas em `actions/dashboard/get-mrr-overview.action.ts`:
- MRR: soma normalizada das assinaturas ativas
- Churn Rate: cancelamentos no período ÷ (ativos + cancelados)
- ARPU: MRR ÷ ativos
- LTV: ARPU ÷ churn_rate_mensal (ou ARPU × 24 se churn = 0)
- Growth Rate: (MRR atual − MRR início) ÷ MRR início

---

## Integração com IA (Gemini)

### Endpoint

`POST /api/ai/analyze`

### Tipos de análise

**1. Análise financeira** (`type: "analysis"`):
- Envia P&L completo + dados do funil + MRR (se org tiver recorrência)
- Gemini identifica onde o dinheiro está sendo perdido
- Sugere ações concretas priorizadas

**2. Comparativo entre períodos** (`type: "comparison"`):
- Usuário seleciona seção + 2 períodos
- Frontend faz 2 fetches paralelos para cada período
- Gemini compara e aponta tendências

### Streaming

O Gemini retorna a resposta via `ReadableStream`. O frontend lê chunk a chunk e atualiza o estado progressivamente.

---

## Estrutura de Arquivos Relevantes

```
actions/
├── costs/                          # CRUD custos fixos e variáveis
├── organizations/                  # Listar, buscar, atualizar orgs
└── dashboard/
    ├── get-funnel.action.ts
    ├── get-daily.action.ts
    ├── get-channels.action.ts
    ├── get-landing-pages.action.ts
    ├── get-pages.action.ts
    ├── get-financial.action.ts
    ├── get-profit-and-loss.action.ts
    ├── get-mrr-overview.action.ts
    ├── get-mrr-movement.action.ts
    ├── get-mrr-growth.action.ts
    └── get-active-subscriptions.action.ts

app/
├── api/
│   ├── track/route.ts              # Ingestão de eventos
│   └── ai/analyze/route.ts         # Gemini (streaming)
├── [slug]/
│   ├── layout.tsx                  # Valida slug + session
│   ├── page.tsx                    # Visão Geral
│   ├── mrr/                        # Recorrência (visível se hasRecurringRevenue)
│   ├── channels/
│   ├── finance/
│   ├── landing-pages/
│   ├── pages/
│   ├── costs/
│   └── settings/
├── docs/                           # Documentação standalone
├── onboarding/
├── organizations/
├── login/
└── register/

db/
├── index.ts                        # Conexão NeonDB
└── schema/
    ├── organization.schema.ts
    ├── event.schema.ts
    ├── subscription.schema.ts
    ├── api-key.schema.ts
    ├── cost.schema.ts
    ├── user.schema.ts
    └── index.ts

hooks/
├── queries/
│   ├── use-funnel.ts
│   ├── use-daily.ts
│   ├── use-channels.ts
│   ├── use-landing-pages.ts
│   ├── use-financial.ts
│   ├── use-mrr-overview.ts
│   ├── use-mrr-movement.ts
│   ├── use-mrr-growth.ts
│   └── use-active-subscriptions.ts
└── mutations/

interfaces/
├── dashboard.interface.ts
├── mrr.interface.ts
├── cost.interface.ts
└── organization.interface.ts

utils/
├── build-funnel-steps.ts           # Injeção automática de pageview/checkout
├── build-pl.ts                     # Cálculo P&L
├── format.ts                       # fmtBRLDecimal, fmtInt
├── resolve-date-range.ts           # Conversão period → Date range
└── rate-limiter.ts                 # Rate limiting in-memory

public/
└── tracker.js                      # Script embeddável (vanilla JS, 393 linhas)
```
