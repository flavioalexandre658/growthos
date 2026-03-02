# GrowthOS — Arquitetura do Sistema

## Visão Geral

O GrowthOS é uma plataforma de Growth Analytics multi-tenant que consolida dados de múltiplos negócios, calcula P&L com custos locais e gera análises com IA.

```
GrowthOS
├── Dashboard (análises de crescimento)
│   ├── Visão Geral    → funnel + KPIs + gráfico diário
│   ├── Templates      → conversão por template (Convitede only)
│   ├── Canais         → receita por canal de aquisição
│   ├── Financeiro     → receita por categoria
│   ├── Landing Pages  → conversão por página
│   └── Custos & P&L   → custos fixos/variáveis + lucro real + IA
└── Multi-tenant
    ├── Convitede  → API própria (NEXT_PUBLIC_API_URL)
    └── 123Rifas   → API própria (futuro)
```

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS, shadcn/ui, Recharts |
| Auth | NextAuth v4 (JWT + Credentials) |
| Banco local | NeonDB (PostgreSQL serverless) |
| ORM | Drizzle ORM |
| IA | Google Gemini 1.5 Flash |
| Data fetching | React Query v5 |

---

## Modelo Multi-tenant

### Conceitos

- **Organization**: empresa cadastrada no banco local. Possui `providerType` que define qual DataProvider usar.
- **DataProvider**: abstração que sabe como buscar dados de uma empresa específica e converter para o formato genérico.
- **ProviderConfig**: objeto estático com `capabilities` (features disponíveis) e definição do funil (steps + rates dinâmicos).

### Fluxo de dados

```
URL (searchParams) → Page (server) → *Content (client)
                                         ↓
                              useOrganization() context
                                         ↓
                              DataProvider (por providerType)
                                         ↓
                      hooks React Query → server actions → API externa
                                         ↓
                              Componentes UI renderizam
```

### Capabilities por Provider

| Feature | Convitede | 123Rifas |
|---------|-----------|----------|
| funnel | ✅ | ✅ |
| channels | ✅ | A definir |
| categories | ✅ | A definir |
| daily | ✅ | A definir |
| templates | ✅ | ❌ |
| templates-opportunities | ✅ | ❌ |
| landing-pages | ✅ | A definir |

O sidebar filtra os itens de navegação com base nas capabilities da org ativa.

---

## Schema do Banco (NeonDB)

### Tabela `organizations`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | ID único |
| name | text | Nome da empresa |
| slug | text unique | Identificador (convitede, 123rifas) |
| api_url | text? | URL da API externa |
| provider_type | text enum | CONVITEDE, RIFAS, CUSTOM |
| created_at | timestamp | |
| updated_at | timestamp | |

### Tabela `fixed_costs`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| organization_id | uuid FK | Referência para organizations |
| name | text | Nome do custo (ex: Aluguel) |
| amount_in_cents | integer | Valor em centavos (PERCENTAGE: 1550 = 15.50%) |
| type | text enum | VALUE ou PERCENTAGE |
| description | text? | Observação |
| created_at | timestamp | |
| updated_at | timestamp | |

### Tabela `variable_costs`

Mesma estrutura de `fixed_costs`.

### Convenção PERCENTAGE

Quando `type = "PERCENTAGE"`, o `amount_in_cents` armazena a porcentagem × 100:
- 15.5% → `amount_in_cents = 1550`
- 5% → `amount_in_cents = 500`

Isso mantém a regra de usar apenas `integer` para evitar problemas com float.

---

## Cálculo de P&L

Função: `utils/build-pl.ts → buildProfitAndLoss()`

```
Receita Bruta (da API, em centavos)
  - Custos Variáveis calculados (VALUE direto, PERCENTAGE × receita / 10000)
  = Lucro Bruto

Receita Bruta
  - Custos Fixos calculados
  - Custos Variáveis calculados
  = Lucro Real

Margem (%) = Lucro Real / Receita Bruta × 100
```

**Nota:** A `Receita Bruta` retornada pela API é em reais (float). Multiplicamos por 100 para converter para centavos antes de calcular.

---

## Funil Genérico

Cada provider define seus próprios steps e taxas. O `IGenericFunnelData` é o formato unificado:

```typescript
{
  steps: [{ key: string, label: string, value: number }],
  rates: [{ key: string, label: string, value: string }],
  revenue: number,
  netRevenue: number,
  ticketMedio: string,
  margin: string,
}
```

- **Convitede**: steps = [Cadastros, Edições, Pagamentos]
- **123Rifas** (futuro): steps = [Cadastros, Campanhas, Pagamentos]

Os componentes `funnel-section.tsx` e `kpi-cards.tsx` renderizam dinamicamente baseado nos steps do `IGenericFunnelData`.

---

## Integração com IA (Gemini)

### Endpoint

`POST /api/ai/analyze`

### Tipos de análise

**1. Análise financeira** (`type: "analysis"`):
- Envia P&L completo + dados do funil
- Gemini identifica onde o dinheiro está sendo perdido
- Sugere ações concretas priorizadas

**2. Comparativo entre períodos** (`type: "comparison"`):
- Usuário seleciona seção + 2 períodos
- Frontend faz 2 fetches paralelos para cada período
- Gemini compara e aponta tendências

### Streaming

O Gemini retorna a resposta via `ReadableStream`. O frontend lê chunk a chunk e atualiza o estado progressivamente, simulando efeito de "digitação".

---

## Como adicionar uma nova organização

1. Inserir registro em `organizations` (via seed ou admin):
   ```sql
   INSERT INTO organizations (name, slug, provider_type, api_url)
   VALUES ('Nova Empresa', 'nova-empresa', 'CONVITEDE', 'https://api.novaempresa.com');
   ```

2. Se for um novo tipo de negócio, criar um DataProvider:
   - Adicionar o `providerType` no enum do schema
   - Criar `lib/data-providers/nova-empresa.provider.ts`
   - Adicionar config em `lib/data-providers/configs.ts`
   - Registrar em `lib/data-providers/registry.ts`

3. A org aparecerá automaticamente no seletor do sidebar.

---

## Estrutura de Arquivos Relevantes

```
actions/
├── costs/                    # CRUD custos fixos e variáveis
├── organizations/            # Listar organizações
└── dashboard/                # Dados da API externa (Convitede)

app/
├── api/ai/analyze/route.ts   # Endpoint Gemini (streaming)
└── dashboard/
    ├── costs/                # Página P&L + IA
    └── _components/          # Sidebar, KpiCards, FunnelSection (genéricos)

components/providers/
├── organization-provider.tsx  # Context global da org ativa
└── query-provider.tsx

db/
├── index.ts                  # Conexão NeonDB
├── schema/                   # Schemas Drizzle
├── migrations/               # Migrations geradas
└── seed.ts                   # Seed das orgs iniciais

hooks/
├── queries/                  # React Query hooks
└── mutations/                # React Query mutations

lib/data-providers/
├── types.ts                  # IDataProvider, IGenericFunnelData
├── configs.ts                # Configs estáticas por providerType
├── convitede.provider.ts     # Implementação Convitede
└── registry.ts               # Factory de providers

utils/
└── build-pl.ts               # Cálculo P&L
```
