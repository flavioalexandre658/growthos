# GrowthOS — Métricas, Dados e Estatísticas

Este documento descreve de forma completa todos os dados, métricas e estatísticas que o GrowthOS coleta, processa e exibe.

---

## 1. Coleta de Dados — tracker.js

O `public/tracker.js` é um script JavaScript embeddable que os clientes instalam em seus sites. Ele é a única fonte de dados primária do GrowthOS.

### Tipos de evento suportados

| Evento | Quando disparar | Dados automáticos | Dados opcionais |
|---|---|---|---|
| `pageview` | Disparado automaticamente ao carregar o script | UTMs, referrer, landing page, device, session_id | — |
| `signup` | Após o usuário criar uma conta | — | user_id, email, metadata |
| `checkout_started` | Quando o usuário inicia o checkout | — | gross_value, discount, metadata |
| `checkout_abandoned` | Quando o usuário abandona o checkout sem pagar (auto com `data-auto-abandon="true"`) | — | gross_value (do checkout iniciado) |
| `payment` | Após pagamento confirmado | — | gross_value, net_value, discount, gateway_fee, installments, payment_method, category |
| Evento customizado | Qualquer passo definido no funil da organização | — | qualquer metadata |

### Contexto capturado automaticamente

Para **todo evento**, o tracker injeta os seguintes campos automaticamente:

| Campo | Descrição |
|---|---|
| `session_id` | ID de sessão gerado no `sessionStorage`, persiste enquanto a aba estiver aberta |
| `landing_page` | URL da primeira página visitada na sessão |
| `referrer` | URL referrer do documento |
| `source` | Canal de aquisição: `google`, `instagram`, `facebook`, `email`, `direct`, etc. (inferido de UTMs e referrer) |
| `utm_source` | Parâmetro UTM capturado da URL |
| `utm_medium` | Parâmetro UTM capturado da URL |
| `utm_campaign` | Parâmetro UTM capturado da URL |
| `utm_term` | Parâmetro UTM capturado da URL |
| `utm_content` | Parâmetro UTM capturado da URL |
| `device` | `mobile`, `tablet` ou `desktop` (inferido de `navigator.userAgent`) |
| `timestamp` | Data/hora ISO 8601 do momento do evento |

### Dados financeiros (eventos de pagamento)

| Campo | Tipo | Descrição |
|---|---|---|
| `gross_value` | number (centavos) | Valor bruto da venda |
| `net_value` | number (centavos) | Valor líquido (após taxas e descontos) |
| `discount` | number (centavos) | Valor do desconto aplicado |
| `gateway_fee` | number (centavos) | Taxa do gateway de pagamento |
| `installments` | number | Número de parcelas |
| `payment_method` | string | `credit_card`, `pix`, `boleto`, etc. |
| `category` | string | Categoria do produto/serviço vendido |

---

## 2. Armazenamento — Tabela events

Todos os eventos são armazenados na tabela `events` no NeonDB com a seguinte estrutura:

```
events
├── id                  UUID, PK
├── organization_id     UUID, FK → organizations
├── event_type          text (pageview, signup, checkout_started, checkout_abandoned, payment, custom...)
├── session_id          text
├── landing_page        text
├── referrer            text
├── source              text
├── utm_source          text
├── utm_medium          text
├── utm_campaign        text
├── utm_term            text
├── utm_content         text
├── device              text
├── gross_value_in_cents integer
├── net_value_in_cents   integer
├── discount_in_cents    integer
├── gateway_fee_in_cents integer
├── installments         integer
├── payment_method       text
├── category             text
├── metadata             jsonb
└── created_at           timestamptz
```

---

## 3. Dashboard — Telas e Métricas Disponíveis

### 3.1 Visão Geral (`/[slug]`)

#### KPI Cards (aparecem automaticamente quando há dados)

| KPI | Fonte | Condição de exibição |
|---|---|---|
| Visitas | `COUNT(DISTINCT session_id)` de `pageview` | Sempre (pageview é injetado automaticamente) |
| [Etapas do funil customizadas] | Contagem por event_type | Se configurado no onboarding |
| Checkout Iniciado | `COUNT(*)` de `checkout_started` | Somente se existirem eventos no período |
| Receita | `SUM(gross_value_in_cents)` de `payment` | Sempre |
| Ticket Médio | Receita ÷ número de pagamentos | Sempre |
| Margem | net_revenue ÷ gross_revenue × 100 | Sempre |
| Checkout Iniciado | `COUNT(*)` de `checkout_started` | Somente se existirem dados |
| Abandonos | `COUNT(*)` de `checkout_abandoned` | Somente se existirem dados |

#### Funil de Conversão

O funil exibe as etapas configuradas pela organização no onboarding, com as seguintes regras:

- `pageview` é **sempre** injetado como primeira etapa (se não configurado explicitamente).
- `checkout_started` é **auto-injetado** como etapa antes do `payment`, se existirem eventos disparados no período.
- O funil exibe o **valor absoluto** de cada etapa e as **taxas de conversão** entre etapas consecutivas.
- Para etapas com `countUnique: true`, é contado o número de sessões únicas (ex.: pageview). Para as demais, o total de eventos.

#### Taxas de conversão calculadas

| Taxa | Fórmula |
|---|---|
| Etapa N → Etapa N+1 | `(step[N+1] / step[N]) * 100` |
| Conversão Total | `(última_etapa / primeira_etapa) * 100` (quando há ≥ 3 etapas) |

#### Gráfico Diário

- Exibe séries por dia para cada etapa do funil (incluindo checkout_started e checkout_abandoned quando há dados).
- Exibe receita bruta e líquida por dia.
- Período configurável via filtro de data.

---

### 3.2 Financeiro (`/[slug]/finance`)

#### KPI Cards

| KPI | Fórmula |
|---|---|
| Receita Bruta | `SUM(gross_value_in_cents)` WHERE event_type = 'payment' |
| Receita Líquida | `SUM(net_value_in_cents)` WHERE event_type = 'payment' |
| Taxas de Gateway | `SUM(gateway_fee_in_cents)` WHERE event_type = 'payment' |
| Descontos | `SUM(discount_in_cents)` WHERE event_type = 'payment' |
| Receita Perdida | `SUM(gross_value_in_cents)` WHERE event_type = 'checkout_abandoned' |
| Ticket Médio | `SUM(gross_value_in_cents) / COUNT(*)` WHERE event_type = 'payment' |
| Margem Bruta | `net_revenue / gross_revenue * 100` |
| Número de Pagamentos | `COUNT(*)` WHERE event_type = 'payment' |

#### Breakdown por Método de Pagamento

Para cada método (credit_card, pix, boleto, etc.):
- Número de pagamentos
- Receita bruta
- Percentual sobre o total

#### Breakdown por Categoria

Para cada categoria de produto/serviço:
- Número de pagamentos
- Receita bruta
- Percentual sobre o total

#### Gráfico de Receita

- Evolução diária de receita bruta e líquida.

---

### 3.3 Canais (`/[slug]/channels`)

Para cada canal de aquisição (`source`):

| Coluna | Descrição |
|---|---|
| Canal | Valor de `source` (google, instagram, direct, etc.) |
| [Etapas do funil] | Contagem por etapa para aquele canal |
| Checkout Iniciado | `COUNT(*)` de `checkout_started` naquele canal (se houver dados) |
| Abandonos | `COUNT(*)` de `checkout_abandoned` naquele canal (se houver dados) |
| Receita | `SUM(gross_value_in_cents)` de `payment` naquele canal |
| Ticket Médio | Receita ÷ pagamentos do canal |
| Taxa de Conversão | `(última_etapa_do_funil / primeira_etapa) * 100` por canal |

Suporta ordenação por qualquer coluna e paginação.

---

### 3.4 Landing Pages (`/[slug]/landing-pages`)

Para cada landing page (`landing_page`):

| Coluna | Descrição |
|---|---|
| URL da página | Valor de `landing_page` |
| [Etapas do funil] | Contagem por etapa para aquela página |
| Checkout Iniciado | `COUNT(*)` de `checkout_started` naquela página (se houver dados) |
| Abandonos | `COUNT(*)` de `checkout_abandoned` naquela página (se houver dados) |
| Receita | `SUM(gross_value_in_cents)` de `payment` com aquela landing page |
| Taxa de Conversão | `(última_etapa / primeira_etapa) * 100` por página |

Suporta busca por URL, ordenação e paginação.

---

### 3.5 Custos & P&L (`/[slug]/costs`)

#### Custos Fixos

Cadastrados manualmente pela organização. Podem ser:
- **Valor absoluto** (R$ X,XX por mês)
- **Percentual** (X% sobre a receita bruta)

#### Custos Variáveis

Mesma estrutura dos fixos, calculados sobre a receita do período.

#### Demonstrativo de Resultado (P&L)

| Linha | Fórmula |
|---|---|
| Receita Bruta | `SUM(gross_value_in_cents)` de payment |
| (–) Custos Variáveis | Soma dos custos variáveis calculados |
| (=) Lucro Bruto | Receita Bruta – Custos Variáveis |
| (–) Custos Fixos | Soma dos custos fixos |
| (=) Lucro Real | Lucro Bruto – Custos Fixos |
| Margem Real | Lucro Real ÷ Receita Bruta × 100 |

#### Receita Perdida (Análise de Oportunidade)

- `SUM(gross_value_in_cents)` WHERE event_type = 'checkout_abandoned'
- Representa o potencial de receita que não se converteu.

---

## 4. Análise com IA (Gemini)

### Análise de Período Único

Enviado para o Gemini 1.5 Flash como contexto:

```json
{
  "pl": {
    "receita_bruta": "R$ X.XXX,XX",
    "custos_fixos": "R$ XXX,XX",
    "custos_variaveis": "R$ XXX,XX",
    "lucro_bruto": "R$ X.XXX,XX",
    "lucro_real": "R$ XXX,XX",
    "margem": "XX%",
    "detalhamento_fixos": [{ "nome": "...", "valor": "..." }],
    "detalhamento_variaveis": [{ "nome": "...", "valor": "..." }]
  },
  "funil": {
    "steps": [{ "etapa": "Visitas", "valor": 1000 }],
    "taxas": [{ "taxa": "Visitas → Cadastros", "valor": "12.3%" }],
    "ticket_medio": "R$ 97,00",
    "margem_api": "85%",
    "checkout_iniciado": 250,
    "checkout_abandonado": 180
  },
  "periodo": { "period": "30d" }
}
```

`checkout_iniciado` e `checkout_abandonado` são incluídos **somente quando existem dados**, permitindo que a IA analise a taxa de abandono e sugira otimizações.

### Comparação de Períodos

Seções disponíveis para comparação entre dois períodos:

| Seção | Dados comparados |
|---|---|
| Visão Geral | Funil completo (steps, taxas, receita, ticket médio, checkouts) + gráfico diário + stepMeta |
| Canais | Dados por canal (steps, receita, ticket médio, conversão) + stepMeta |
| Financeiro | Dados financeiros (receita, taxas, descontos, receita perdida) + P&L |
| Landing Pages | Dados por página (steps, receita, conversão) + stepMeta |

---

## 5. Regras de Auto-Injeção de Eventos

### pageview

- Sempre injetado como **primeira etapa do funil** se não estiver na configuração da organização.
- Disparado **automaticamente** pelo `tracker.js` ao carregar, sem código adicional.
- Usa `countUnique: true` → conta sessões únicas, não total de eventos.

### checkout_started

- Injetado automaticamente como etapa do funil **somente se existirem dados** no período consultado.
- Posicionado **antes do `payment`** no funil se esse evento existir.
- Usa `countUnique: false` → conta total de eventos.
- Aparece em: KPI Cards, Funil, Gráfico Diário, Canais, Landing Pages, Análise IA.

### checkout_abandoned

- **Não** é injetado como etapa do funil (é um evento de saída, não progressão).
- Aparece como:
  - KPI Card "Abandonos" (overview) → quando há dados.
  - Coluna em Canais e Landing Pages → quando há dados.
  - Série no Gráfico Diário → quando há dados.
  - "Receita Perdida" na página Financeiro → sempre calculado.
  - Campo `checkout_abandonado` no payload da Análise IA → quando há dados.

---

## 6. Resumo por Tela

| Tela | Checkout Iniciado | Abandonos | Funil Dinâmico |
|---|---|---|---|
| Visão Geral (KPIs) | KPI card se houver dados | KPI card se houver dados | Sim |
| Visão Geral (Funil) | Etapa auto-injetada se houver dados | Não (é drop-off) | Sim |
| Visão Geral (Gráfico Diário) | Série se houver dados | Série se houver dados | Sim |
| Financeiro | Não | Como "Receita Perdida" | Não |
| Canais | Coluna se houver dados | Coluna se houver dados | Sim |
| Landing Pages | Coluna se houver dados | Coluna se houver dados | Sim |
| Custos & P&L (IA) | No payload do Gemini se houver dados | No payload do Gemini se houver dados | Sim |

---

## 7. Filtros Disponíveis

Todos os endpoints de dashboard suportam os seguintes filtros de período:

| Filtro | Período |
|---|---|
| `today` | Hoje |
| `yesterday` | Ontem |
| `3d` | Últimos 3 dias |
| `7d` | Últimos 7 dias |
| `this_month` | Mês atual |
| `30d` | Últimos 30 dias |
| `90d` | Últimos 90 dias |
| `start_date` + `end_date` | Intervalo customizado |

---

## 8. Multi-tenancy

Todos os dados são isolados por `organization_id`. Um usuário pode pertencer a múltiplas organizações. A organização ativa é determinada pelo `slug` na URL (`/[slug]/...`). Cada organização possui:

- Configuração de funil própria (`funnelSteps` — etapas customizadas)
- API Keys próprias para integração do tracker
- Custos fixos e variáveis próprios
- Dados de eventos completamente isolados
