"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IconCheck } from "@tabler/icons-react";
import { CodeBlock } from "./code-block";
import { EventCard } from "./event-card";
import { Callout } from "./callout";
import { AutoPropTable } from "./auto-prop-table";

const AUTO_CONTEXT_ROWS = [
  { name: "utm_source", source: "?utm_source na URL", example: "google" },
  { name: "utm_medium", source: "?utm_medium na URL", example: "cpc" },
  {
    name: "utm_campaign",
    source: "?utm_campaign na URL",
    example: "black-friday",
  },
  {
    name: "utm_content",
    source: "?utm_content na URL",
    example: "banner-topo",
  },
  {
    name: "landing_page",
    source: "window.location.pathname",
    example: "/convite/casamento",
  },
  {
    name: "referrer",
    source: "document.referrer + inferência",
    example: "instagram.com",
  },
  {
    name: "device",
    source: "navigator.userAgent",
    example: "mobile | desktop",
  },
  {
    name: "session_id",
    source: "sessionStorage (anônimo, gerado)",
    example: "sess_abc123",
  },
];

const INSTALL_HTML = `<script
  src="https://growthos.com.br/tracker.js"
  data-key="tok_xxx"
></script>`;

const INSTALL_NEXTJS = `import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head />
      <body>
        {children}
        <Script
          src="https://growthos.com.br/tracker.js"
          data-key={process.env.NEXT_PUBLIC_GROWTHOS_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}`;

const ENV_CODE = `NEXT_PUBLIC_GROWTHOS_KEY=tok_convitede_xxx`;

const HOOK_CODE = `'use client'

import { useCallback } from 'react'
import type { GrowthOSEventType, GrowthOSEventData } from '@/types/growthos'

export function useTracker() {
  const track = useCallback(
    (eventType: GrowthOSEventType, data?: GrowthOSEventData) => {
      if (typeof window === 'undefined') return
      if (!window.GrowthOS) return
      window.GrowthOS.track(eventType, data)
    },
    []
  )

  return { track }
}`;

const HOOK_USAGE_CODE = `'use client'

import { useTracker } from '@/hooks/use-tracker'

export function CheckoutButton({ product, price }) {
  const { track } = useTracker()

  const handleCheckout = async () => {
    track('checkout_started', {
      gross_value: price,
      product_id: product.id,
      product_name: product.name,
    })

    await openCheckout(product.id)
  }

  return (
    <button onClick={handleCheckout}>
      Comprar por R$ {price}
    </button>
  )
}`;

const PAYMENT_CODE = `window.GrowthOS.track('payment', {
  gross_value: 150.00,      // valor bruto cobrado
  net_value: 140.00,        // após desconto, antes das taxas
  discount: 10.00,          // desconto em reais
  gateway_fee: 4.50,        // taxa Pagar.me, Stripe...
  installments: 1,          // número de parcelas
  payment_method: 'pix',    // pix | credit_card | boleto | debit_card
  product_id: 'template-casamento-001',
  product_name: 'Convite Casamento Premium',
  category: 'casamento',
  customer_type: 'new',     // new | returning
  customer_id: 'hash_anonimo_cliente',
})`;

const SIGNUP_CODE = `window.GrowthOS.track('signup', {
  customer_type: 'new',
  customer_id: 'hash_anonimo',
})`;

const ABANDONED_CODE = `window.GrowthOS.track('checkout_abandoned', {
  gross_value: 89.00,
  product_id: 'template-aniversario-002',
  reason: 'exit',  // exit | payment_failed | timeout
})`;

const DATA_ATTRS_CODE = `<!-- Botão de pagamento -->
<button
  data-growthos="payment"
  data-growthos-value="89.90"
  data-growthos-product_id="template-casamento-001"
  data-growthos-product_name="Convite Casamento Premium"
  data-growthos-payment_method="pix"
>
  Pagar com PIX
</button>

<!-- Cadastro -->
<button
  data-growthos="signup"
  data-growthos-customer_type="new"
>
  Criar conta grátis
</button>`;

const TYPES_CODE = `export type GrowthOSEventType =
  | 'pageview'
  | 'signup'
  | 'trial_started'
  | 'checkout_started'
  | 'checkout_abandoned'
  | 'payment'

export type GrowthOSPaymentMethod =
  | 'pix'
  | 'credit_card'
  | 'debit_card'
  | 'boleto'

export type GrowthOSCustomerType = 'new' | 'returning'

export interface GrowthOSEventData {
  gross_value?: number
  net_value?: number
  discount?: number
  gateway_fee?: number
  installments?: number
  payment_method?: GrowthOSPaymentMethod
  product_id?: string
  product_name?: string
  category?: string
  customer_type?: GrowthOSCustomerType
  customer_id?: string
  reason?: 'exit' | 'payment_failed' | 'timeout'
  metadata?: Record<string, unknown>
}

declare global {
  interface Window {
    GrowthOS: {
      track: (eventType: GrowthOSEventType, data?: GrowthOSEventData) => void
    }
  }
}`;

const DEBUG_CODE = `// Verificar se o tracker carregou
console.log(window.GrowthOS)
// Deve retornar: { track: ƒ }

// Disparar evento de teste
window.GrowthOS.track('pageview')
// Verificar no Network: POST /api/track → 204`;

const DEBUG_ATTRS_CODE = `<script
  src="https://growthos.com.br/tracker.js"
  data-key="tok_xxx"
  data-debug="true"
></script>

// Console vai mostrar:
// [GrowthOS] track: payment { gross_value: 150, source: "google", ... }`;

const CHECKLIST_ITEMS = [
  {
    label: "Script carregou sem erro no Network",
    detail: "Network → tracker.js → status 200",
  },
  {
    label: "window.GrowthOS existe no console",
    detail: "typeof window.GrowthOS === 'object'",
  },
  {
    label: "UTMs sendo capturados",
    detail: "Acesse /?utm_source=teste e confira o payload",
  },
  {
    label: "POST /api/track retorna 204",
    detail: "Disparar evento e checar no Network",
  },
  { label: "Dados no dashboard em até 30s", detail: "Visão Geral → atualizar" },
  {
    label: "Sem PII nos payloads",
    detail: "Nunca enviar email, CPF ou nome no customer_id",
  },
];

export function DocsContent() {
  return (
    <Tabs defaultValue="install" className="flex gap-0 h-full">
      {/* Sidebar nav */}
      <div className="w-52 shrink-0 border-r border-border pr-4 pt-6 sticky top-0 h-[calc(100vh-57px)] overflow-y-auto">
        <TabsList className="flex flex-col h-auto bg-transparent gap-0.5 items-start w-full p-0">
          {[
            { value: "install", label: "Instalação" },
            { value: "nextjs", label: "Next.js" },
            { value: "auto", label: "Auto-tracking" },
            { value: "manual", label: "Eventos Manuais" },
            { value: "reference", label: "Referência" },
            { value: "attributes", label: "Data Attributes" },
            { value: "typescript", label: "TypeScript" },
            { value: "debug", label: "Debug" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="w-full justify-start text-sm px-3 py-2 rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-10 pt-6 pb-20 overflow-y-auto">
        {/* Instalação */}
        <TabsContent value="install" className="mt-0 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Instalação
              </h2>
              <Badge variant="secondary">2 linhas</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Adicione o script no{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {"<head>"}
              </code>{" "}
              de qualquer página. Substitua{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-green-400">
                tok_xxx
              </code>{" "}
              pela API key disponível em Settings.
            </p>
          </div>

          <CodeBlock
            code={INSTALL_HTML}
            lang="html"
            title="Qualquer sistema HTML"
          />

          <Callout type="tip">
            Instale <strong>antes</strong> de qualquer outro script para
            garantir que UTMs e referrer sejam capturados desde o primeiro
            carregamento.
          </Callout>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider text-xs">
              O que é capturado automaticamente
            </h3>
            <AutoPropTable rows={AUTO_CONTEXT_ROWS} />
          </div>
        </TabsContent>

        {/* Next.js */}
        <TabsContent value="nextjs" className="mt-0 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Integração Next.js
              </h2>
              <Badge variant="secondary">App Router</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use o componente{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                Script
              </code>{" "}
              do Next.js no{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                layout.tsx
              </code>{" "}
              raiz.
            </p>
          </div>

          <CodeBlock code={INSTALL_NEXTJS} lang="tsx" title="app/layout.tsx" />
          <CodeBlock code={ENV_CODE} lang="bash" title=".env.local" />

          <Callout type="warn">
            Use{" "}
            <code className="font-mono text-xs">
              strategy="afterInteractive"
            </code>{" "}
            para não bloquear o carregamento. Os UTMs da URL são capturados
            corretamente mesmo com essa estratégia.
          </Callout>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hook reutilizável (recomendado)
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Crie um hook para não depender de{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                window
              </code>{" "}
              diretamente nos componentes. Fica tipado e seguro para SSR.
            </p>
            <CodeBlock
              code={HOOK_CODE}
              lang="ts"
              title="hooks/use-tracker.ts"
            />
            <CodeBlock
              code={HOOK_USAGE_CODE}
              lang="tsx"
              title="Usando em um componente"
            />
          </div>
        </TabsContent>

        {/* Auto-tracking */}
        <TabsContent value="auto" className="mt-0 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Auto-Tracking
              </h2>
              <Badge variant="secondary">zero config</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O tracker detecta e envia alguns eventos automaticamente — sem
              nenhum código adicional.
            </p>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/40 border-b border-border">
              <span>Evento</span>
              <span>Quando dispara</span>
              <span>Dados automáticos</span>
            </div>
            {[
              [
                "pageview",
                "Carregamento inicial da página",
                "landing_page, referrer, device, UTMs",
              ],
              [
                "pageview",
                "Navegação SPA (history.pushState)",
                "nova landing_page, mantém session_id",
              ],
            ].map(([event, when, data], i) => (
              <div
                key={i}
                className="grid grid-cols-3 text-sm px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20"
              >
                <code className="font-mono text-xs text-blue-400">{event}</code>
                <span className="text-muted-foreground text-xs">{when}</span>
                <span className="text-xs text-muted-foreground">{data}</span>
              </div>
            ))}
          </div>

          <Callout type="info">
            Você nunca precisa passar manualmente:{" "}
            <code className="font-mono text-xs">source</code>,{" "}
            <code className="font-mono text-xs">medium</code>,{" "}
            <code className="font-mono text-xs">campaign</code>,{" "}
            <code className="font-mono text-xs">landing_page</code>,{" "}
            <code className="font-mono text-xs">device</code>,{" "}
            <code className="font-mono text-xs">referrer</code> ou{" "}
            <code className="font-mono text-xs">session_id</code>. O tracker já
            os captura e merge automaticamente.
          </Callout>
        </TabsContent>

        {/* Eventos Manuais */}
        <TabsContent value="manual" className="mt-0 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Eventos Manuais
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                window.GrowthOS.track
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para eventos que dependem de lógica do servidor — como confirmação
              de pagamento — use o método manual após a resposta da API.
            </p>
          </div>

          <CodeBlock
            code={PAYMENT_CODE}
            lang="js"
            title="payment — mais importante"
          />
          <CodeBlock code={SIGNUP_CODE} lang="js" title="signup" />
          <CodeBlock
            code={ABANDONED_CODE}
            lang="js"
            title="checkout_abandoned — receita perdida"
          />
        </TabsContent>

        {/* Referência */}
        <TabsContent value="reference" className="mt-0 space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-1">
              Referência de Eventos
            </h2>
            <p className="text-sm text-muted-foreground">
              Todos os eventos suportados e suas propriedades.{" "}
              <span className="text-destructive">*</span> = obrigatório.
            </p>
          </div>

          <div className="space-y-5">
            <EventCard
              name="payment"
              description="Pagamento confirmado. Alimenta faturamento, margem, ticket médio e ROAS."
              variant="default"
              props={[
                {
                  name: "gross_value",
                  type: "number",
                  required: true,
                  description: "Valor bruto cobrado",
                  example: "150.00",
                },
                {
                  name: "net_value",
                  type: "number",
                  description: "Após desconto, antes das taxas",
                  example: "140.00",
                },
                {
                  name: "discount",
                  type: "number",
                  description: "Desconto em reais",
                  example: "10.00",
                },
                {
                  name: "gateway_fee",
                  type: "number",
                  description: "Taxa da gateway",
                  example: "4.50",
                },
                {
                  name: "installments",
                  type: "number",
                  description: "Número de parcelas",
                  example: "3",
                },
                {
                  name: "payment_method",
                  type: "string",
                  description: "pix | credit_card | boleto | debit_card",
                  example: "'pix'",
                },
                {
                  name: "product_id",
                  type: "string",
                  description: "ID único do produto",
                  example: "'template-001'",
                },
                {
                  name: "product_name",
                  type: "string",
                  description: "Nome legível do produto",
                  example: "'Convite Casamento'",
                },
                {
                  name: "category",
                  type: "string",
                  description: "Categoria do produto",
                  example: "'casamento'",
                },
                {
                  name: "customer_type",
                  type: "string",
                  description: "new | returning",
                  example: "'new'",
                },
                {
                  name: "customer_id",
                  type: "string",
                  description: "Hash anônimo (nunca PII)",
                  example: "'hash_abc'",
                },
              ]}
            />

            <EventCard
              name="signup"
              description="Novo cadastro. Calcula taxa de conversão e CAC."
              variant="secondary"
              props={[
                {
                  name: "customer_type",
                  type: "string",
                  description: "new | returning",
                  example: "'new'",
                },
                {
                  name: "customer_id",
                  type: "string",
                  description: "Hash anônimo",
                  example: "'hash_abc'",
                },
              ]}
            />

            <EventCard
              name="checkout_started"
              description="Início do checkout. Par com checkout_abandoned para calcular abandono."
              variant="outline"
              props={[
                {
                  name: "gross_value",
                  type: "number",
                  description: "Valor no carrinho",
                  example: "89.00",
                },
                {
                  name: "product_id",
                  type: "string",
                  description: "ID do produto",
                  example: "'template-001'",
                },
              ]}
            />

            <EventCard
              name="checkout_abandoned"
              description="Checkout não concluído. Representa receita perdida no P&L."
              variant="destructive"
              props={[
                {
                  name: "gross_value",
                  type: "number",
                  description: "Valor que não converteu",
                  example: "89.00",
                },
                {
                  name: "product_id",
                  type: "string",
                  description: "ID do produto",
                  example: "'template-001'",
                },
                {
                  name: "reason",
                  type: "string",
                  description: "exit | payment_failed | timeout",
                  example: "'exit'",
                },
              ]}
            />

            <EventCard
              name="trial_started"
              description="Início de período trial. Usado no funil customizável por organização."
              variant="secondary"
              props={[
                {
                  name: "product_id",
                  type: "string",
                  description: "Plano ou produto trial",
                  example: "'plano-pro'",
                },
              ]}
            />
          </div>
        </TabsContent>

        {/* Data Attributes */}
        <TabsContent value="attributes" className="mt-0 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Data Attributes
              </h2>
              <Badge variant="secondary">sem JavaScript</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para elementos HTML que disparam eventos sem código JS. Útil em
              templates, páginas estáticas e sistemas sem acesso ao JS.
            </p>
          </div>

          <CodeBlock
            code={DATA_ATTRS_CODE}
            lang="html"
            title="HTML — data attributes"
          />

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/40 border-b border-border">
              <span>Atributo</span>
              <span>Equivalente JS</span>
              <span>Notas</span>
            </div>
            {[
              [
                "data-growthos",
                "eventType",
                "Obrigatório. Define o tipo do evento",
              ],
              [
                "data-growthos-value",
                "gross_value",
                "Converte ponto decimal automaticamente",
              ],
              ["data-growthos-product_id", "product_id", ""],
              ["data-growthos-product_name", "product_name", ""],
              ["data-growthos-category", "category", ""],
              ["data-growthos-payment_method", "payment_method", ""],
              ["data-growthos-customer_type", "customer_type", ""],
            ].map(([attr, js, note]) => (
              <div
                key={attr}
                className="grid grid-cols-3 text-sm px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20"
              >
                <code className="font-mono text-xs text-blue-400">{attr}</code>
                <code className="font-mono text-xs text-green-400">{js}</code>
                <span className="text-xs text-muted-foreground">{note}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TypeScript */}
        <TabsContent value="typescript" className="mt-0 space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-1">
              TypeScript
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Copie para{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                src/types/growthos.d.ts
              </code>{" "}
              para ter tipagem completa no projeto.
            </p>
          </div>

          <CodeBlock
            code={TYPES_CODE}
            lang="ts"
            title="src/types/growthos.d.ts"
          />
        </TabsContent>

        {/* Debug */}
        <TabsContent value="debug" className="mt-0 space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-1">
              Debug & Validação
            </h2>
            <p className="text-sm text-muted-foreground">
              Ferramentas para confirmar que o tracker está funcionando
              corretamente.
            </p>
          </div>

          <CodeBlock code={DEBUG_CODE} lang="js" title="Console do navegador" />
          <CodeBlock
            code={DEBUG_ATTRS_CODE}
            lang="html"
            title="Modo debug — data-debug=true"
          />

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Checklist de validação
            </h3>
            {CHECKLIST_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <IconCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Callout type="warn">
            <strong>Nunca envie PII no customer_id.</strong> Use sempre um hash
            anônimo gerado pelo seu sistema. Ex:{" "}
            <code className="font-mono text-xs">sha256(user.id + salt)</code>
          </Callout>
        </TabsContent>
      </div>
    </Tabs>
  );
}
