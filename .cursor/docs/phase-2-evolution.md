# GrowthOS, Evolução para Fase 2

## Onde estamos agora (Fase 1)

```
GrowthOS
├── Convitede   → API própria (funcionando)
└── 123Rifas    → Schema no banco, provider stub (pendente)
```

A abstração está pronta. Adicionar 123Rifas é criar um provider, sem reescrever nada.

---

## Como implementar 123Rifas (próximo passo imediato)

### Passo 1, Criar endpoints na API da 123Rifas

A API da 123Rifas precisa expor endpoints no mesmo padrão do GrowthOS:

| Endpoint                  | Dados esperados                                                                 |
| ------------------------- | ------------------------------------------------------------------------------- |
| `GET /dashboard/funnel`   | signups, campaigns, payments, revenue, net_revenue, rates, ticket_medio, margin |
| `GET /dashboard/channels` | channel, payments, revenue, ticket_medio, conversion_rate                       |
| `GET /dashboard/daily`    | date, signups, campaigns, payments, revenue                                     |

**Diferença principal:** o campo `edits` vira `campaigns`. O funil é Cadastro → Campanha → Pagamento.

### Passo 2, Criar RifasProvider

```typescript
// lib/data-providers/rifas.provider.ts
export class RifasProvider implements IDataProvider {
  getConfig(): IProviderConfig {
    return {
      capabilities: ["funnel", "channels", "daily"],
      funnelSteps: [
        { key: "signups",   label: "Cadastros" },
        { key: "campaigns", label: "Campanhas" },
        { key: "payments",  label: "Pagamentos" },
      ],
      funnelRates: [
        { from: "signups",   to: "campaigns", label: "Cadastro → Campanha" },
        { from: "campaigns", to: "payments",  label: "Campanha → Pagamento" },
        { from: "signups",   to: "payments",  label: "Conversão Total" },
      ],
    };
  }

  async getFunnel(filter: IDateFilter): Promise<IGenericFunnelData | null> {
    // Chama API da 123Rifas e mapeia para IGenericFunnelData
    const raw = await fetchRifasApi("/dashboard/funnel", filter);
    return {
      steps: [
        { key: "signups",   label: "Cadastros",  value: raw.signups },
        { key: "campaigns", label: "Campanhas",  value: raw.campaigns },
        { key: "payments",  label: "Pagamentos", value: raw.payments },
      ],
      rates: [...],
      revenue: raw.revenue,
      netRevenue: raw.net_revenue,
      ticketMedio: raw.ticket_medio,
      margin: raw.margin,
    };
  }
}
```

### Passo 3, Registrar no registry

```typescript
// lib/data-providers/registry.ts
import { RifasProvider } from "./rifas.provider";

const PROVIDERS = {
  CONVITEDE: () => new ConvitedeProvider(),
  RIFAS: () => new RifasProvider(), // adicionar esta linha
};
```

### Passo 4, Adicionar config em configs.ts

```typescript
// lib/data-providers/configs.ts
RIFAS: {
  capabilities: ["funnel", "channels", "daily"],
  funnelSteps: [
    { key: "signups",   label: "Cadastros" },
    { key: "campaigns", label: "Campanhas" },
    { key: "payments",  label: "Pagamentos" },
  ],
  funnelRates: [...],
}
```

Pronto. A 123Rifas aparecerá no seletor do sidebar com funil e métricas próprias.

---

## Contexto do Gemini para Rifas

O prompt do Gemini já aceita o `providerType`. Para rifas, o contexto muda:

```typescript
// app/api/ai/analyze/route.ts, já implementado
const context =
  providerType === "RIFAS"
    ? "empresa de rifas online (métricas: tickets vendidos, campanhas ativas, prêmios)"
    : "plataforma de convites digitais (...)";
```

---

## Fase 2, Clientes Externos

### Opção A: SDK (clientes com sistema próprio)

O cliente instala um pacote npm que faz push de eventos para o GrowthOS:

```bash
npm install @growthos/sdk
```

```typescript
import { GrowthOS } from "@growthos/sdk";
const sdk = new GrowthOS({ apiKey: "..." });
sdk.track("payment", { amount: 4990, userId: "..." });
```

**Implementação no GrowthOS:**

- Criar `SDKProvider` que lê eventos de uma tabela `events` no NeonDB
- Criar endpoint `POST /api/sdk/ingest` para receber eventos
- Mapear eventos para `IGenericFunnelData`

### Opção B: OAuth Connectors (Stripe, Shopify)

Para clientes que usam plataformas populares:

```typescript
export class StripeProvider implements IDataProvider {
  constructor(private accessToken: string) {}

  async getFunnel(filter: IDateFilter) {
    const charges = await stripe.charges.list({ ... });
    return mapStripeToGenericFunnel(charges);
  }
}
```

**O que muda:**

- `organizations.api_url` vira null
- Nova coluna `oauth_token` ou `credentials` (encrypted) na tabela `organizations`
- Provider recebe o token no construtor

### Opção C: Connection String (clientes enterprise)

```typescript
export class PostgresProvider implements IDataProvider {
  constructor(private connectionString: string) {}

  async getFunnel(filter: IDateFilter) {
    const db = drizzle(neon(this.connectionString));
    // Query direta no banco do cliente (readonly)
  }
}
```

**Segurança:** sempre usar connection string com permissão `SELECT` only.

---

## Migração para Routing URL-based (quando quiser)

Atualmente: `/dashboard/...` com `OrganizationProvider` via Context.

Futura migração para: `/org/[slug]/dashboard/...`

### O que mudar:

1. Mover `app/dashboard/` para `app/org/[slug]/dashboard/`
2. Ler `slug` do `params` no layout: `app/org/[slug]/layout.tsx`
3. Passar a org como prop para os componentes (sem precisar do Context)
4. Remover o `OrganizationProvider` e o seletor do sidebar
5. O `OrganizationContext` passa a ser inicializado pelo layout server-side

### Benefícios:

- URL compartilhável por org
- SEO por empresa
- Isolamento mais claro

### Por que não agora:

- Refatoração grande (todos os componentes)
- O Context funciona bem para 2 orgs
- Priorizar features > refatoração

---

## Roadmap resumido

| Fase                   | O que fazer                                     |
| ---------------------- | ----------------------------------------------- |
| **Agora**              | Custos + P&L + IA funcionando para Convitede ✅ |
| **Próximas 2 semanas** | RifasProvider + API endpoints 123Rifas          |
| **1 mês**              | SDK para clientes externos (beta)               |
| **3 meses**            | OAuth Stripe connector                          |
| **6 meses**            | Routing URL-based + white-label                 |

---

## Variáveis de Ambiente necessárias por fase

### Fase 1 (atual)

```env
DATABASE_URL=          # NeonDB connection string
GEMINI_API_KEY=        # Google AI Studio
NEXT_PUBLIC_API_URL=   # API Convitede
NEXTAUTH_SECRET=       # NextAuth
NEXTAUTH_URL=          # URL do app
```

### Fase 2 (adicionar)

```env
RIFAS_API_URL=         # API 123Rifas
STRIPE_CLIENT_ID=      # OAuth Stripe (futuro)
STRIPE_CLIENT_SECRET=  # OAuth Stripe (futuro)
```
