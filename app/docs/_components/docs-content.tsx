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
    example: "s_abc123",
  },
];

const INSTALL_HTML = `<script
  async
  src="https://growthos.dev/tracker.js"
  data-key="tok_xxx"
></script>`;

const SCRIPT_ATTRS_ROWS = [
  {
    name: "data-key",
    required: "sim",
    description: "API key da organização. Obtida em Configurações.",
    example: "tok_convitede_xxx",
  },
  {
    name: "data-debug",
    required: "não",
    description: 'Habilita logs no console: "[GrowthOS] track: evento {...}".',
    example: "true",
  },
  {
    name: "data-auto-abandon",
    required: "não",
    description:
      "Desabilita a detecção automática de checkout_abandoned no beforeunload. Padrão: habilitado.",
    example: "false",
  },
];

const INSTALL_NEXTJS = `import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head />
      <body>
        {children}
        <Script
          src="https://growthos.dev/tracker.js"
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

const CHECKOUT_STARTED_CODE = `window.GrowthOS.track('checkout_started', {
  gross_value: 89.00,
  product_id: 'template-aniversario-002',
  product_name: 'Convite Aniversário Standard',
})

// A partir desse momento, se o usuário fechar a aba/navegador
// antes de um evento 'payment', o tracker envia automaticamente
// um 'checkout_abandoned' via beforeunload + navigator.sendBeacon`;

const SIGNUP_CODE = `window.GrowthOS.track('signup', {
  customer_type: 'new',
  customer_id: 'hash_anonimo',
})`;

const ABANDONED_CODE = `// Disparo manual — quando você sabe o motivo exato
window.GrowthOS.track('checkout_abandoned', {
  gross_value: 89.00,
  product_id: 'template-aniversario-002',
  reason: 'payment_failed',  // exit | payment_failed | timeout
})

// Disparo automático — pelo tracker via beforeunload
// Não é necessário nenhum código adicional.
// O tracker usa os dados do último checkout_started salvo em sessionStorage.`;

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
  async
  src="https://growthos.dev/tracker.js"
  data-key="tok_xxx"
  data-debug="true"
></script>

// Console vai mostrar:
// [GrowthOS] track: payment { gross_value: 150, source: "google", ... }`;

const DEBUG_QUEUE_CODE = `// Verificar eventos na fila offline (pendentes de envio)
JSON.parse(localStorage.getItem('growthos_queue') || '[]')

// Verificar UTMs persistidos na sessão atual
JSON.parse(sessionStorage.getItem('growthos_utm') || 'null')

// Verificar checkout em andamento
JSON.parse(sessionStorage.getItem('growthos_checkout') || 'null')

// Limpar a fila manualmente (em caso de eventos inválidos presos)
localStorage.removeItem('growthos_queue')`;

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

const API_PAYLOAD_CODE = `POST /api/track
Content-Type: application/json

{
  "key": "tok_xxx",            // obrigatório — API key
  "event_type": "payment",     // obrigatório — tipo do evento

  // valores monetários — enviar em reais, a API converte para centavos
  "gross_value": 150.00,
  "net_value": 140.00,
  "discount": 10.00,
  "gateway_fee": 4.50,
  "installments": 1,
  "payment_method": "pix",

  // produto
  "product_id": "template-001",
  "product_name": "Convite Casamento",
  "category": "casamento",

  // atribuição — preenchido automaticamente pelo tracker
  "source": "google",
  "medium": "organic",
  "campaign": "val2024",
  "content": "banner-topo",
  "landing_page": "/convite/casamento",
  "referrer": "https://google.com",

  // contexto — preenchido automaticamente pelo tracker
  "device": "mobile",
  "customer_type": "new",
  "customer_id": "hash_anonimo",
  "session_id": "s_abc123",

  // extra livre — max 20 chaves, strings max 500 chars
  "metadata": { "promo_code": "VERAO10" }
}`;

const API_RESPONSES_ROWS = [
  {
    status: "204",
    meaning: "No Content",
    description: "Evento registrado com sucesso.",
  },
  {
    status: "400",
    meaning: "Bad Request",
    description: "Payload inválido ou campos key / event_type ausentes.",
  },
  {
    status: "401",
    meaning: "Unauthorized",
    description: "API key inválida, inativa ou expirada.",
  },
  {
    status: "413",
    meaning: "Payload Too Large",
    description: "Payload excede 64KB.",
  },
  {
    status: "429",
    meaning: "Too Many Requests",
    description: "Rate limit: 1.000 req/min por API key.",
  },
];

export function DocsContent() {
  return (
    <Tabs defaultValue="install" className="flex gap-0 h-full">
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
            { value: "api", label: "API Reference" },
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
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-green-600 dark:text-green-400">
                tok_xxx
              </code>{" "}
              pela API key disponível em Configurações.
            </p>
          </div>

          <CodeBlock
            code={INSTALL_HTML}
            lang="html"
            title="Qualquer sistema HTML"
          />

          <Callout type="tip">
            O atributo{" "}
            <code className="font-mono text-xs">async</code> garante que o
            script é carregado em paralelo, sem bloquear o parsing do HTML nem
            atrasar o{" "}
            <code className="font-mono text-xs">LCP</code> da página. O
            tracker só executa após o download, sem nenhum impacto no
            desempenho do site.
          </Callout>

          <Callout type="warn">
            Substitua{" "}
            <code className="font-mono text-xs">https://growthos.dev</code>{" "}
            pelo domínio onde o <strong>seu</strong> GrowthOS está hospedado. O
            tracker extrai automaticamente o endpoint a partir do{" "}
            <code className="font-mono text-xs">src</code> — eventos são
            enviados para{" "}
            <code className="font-mono text-xs">SEU_DOMINIO/api/track</code>.
            O snippet correto já é gerado no passo de instalação do onboarding.
          </Callout>

          <Callout type="info">
            Instale <strong>antes</strong> de qualquer outro script para
            garantir que UTMs e referrer sejam capturados desde o primeiro
            carregamento.
          </Callout>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
              Atributos do script
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/40 border-b border-border">
                <span>atributo</span>
                <span>obrigatório</span>
                <span className="col-span-2">descrição / exemplo</span>
              </div>
              {SCRIPT_ATTRS_ROWS.map((row) => (
                <div
                  key={row.name}
                  className="grid grid-cols-4 text-sm px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <code className="font-mono text-xs text-blue-600 dark:text-blue-400">
                    {row.name}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {row.required}
                  </span>
                  <span className="col-span-2 text-xs text-muted-foreground">
                    {row.description}{" "}
                    <code className="font-mono text-xs text-green-600 dark:text-green-400">
                      {row.example}
                    </code>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
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
              {`strategy="afterInteractive"`}
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
                "Carregamento inicial da página (window load)",
                "landing_page, referrer, device, UTMs, session_id",
              ],
              [
                "pageview",
                "Navegação SPA — history.pushState, replaceState ou popstate",
                "nova landing_page, mantém session_id e UTMs da sessão",
              ],
              [
                "checkout_abandoned",
                "Fechamento de aba/navegador após checkout_started (beforeunload + sendBeacon)",
                "dados do último checkout_started + reason: 'exit'",
              ],
            ].map(([event, when, data], i) => (
              <div
                key={i}
                className="grid grid-cols-3 text-sm px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20"
              >
                <code className="font-mono text-xs text-blue-600 dark:text-blue-400">
                  {event}
                </code>
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
            os captura e faz merge automaticamente em todo evento.
          </Callout>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              SPA Tracking — como funciona
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O tracker intercepta{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                history.pushState
              </code>
              ,{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                history.replaceState
              </code>{" "}
              e o evento{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                popstate
              </code>
              . Um{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                pageview
              </code>{" "}
              é disparado automaticamente sempre que o pathname muda — sem
              nenhuma configuração extra.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Auto-detecção de checkout_abandoned
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quando{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                checkout_started
              </code>{" "}
              é disparado, o tracker salva os dados em{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                sessionStorage
              </code>
              . Se o usuário fechar a aba antes de um{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                payment
              </code>
              , o listener{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                beforeunload
              </code>{" "}
              envia o evento via{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                navigator.sendBeacon
              </code>
              . Para desabilitar, use{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                data-auto-abandon="false"
              </code>{" "}
              no script.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fila offline
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Se o envio falhar por queda de rede, o evento é salvo em{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                localStorage
              </code>{" "}
              (chave{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                growthos_queue
              </code>
              , máximo 50 itens). No próximo carregamento de página o tracker
              faz flush automático da fila antes de registrar novos eventos.
            </p>
          </div>
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

          <Callout type="tip">
            Dispare <code className="font-mono text-xs">payment</code> somente
            após confirmação do servidor. Disparar no clique do botão gera dados
            incorretos caso o pagamento seja recusado.
          </Callout>

          <CodeBlock
            code={CHECKOUT_STARTED_CODE}
            lang="js"
            title="checkout_started — habilita auto-abandon"
          />

          <Callout type="info">
            <code className="font-mono text-xs">checkout_started</code> é o
            pré-requisito para o auto-abandonment funcionar. Sem ele, o tracker
            não tem dados para enviar no{" "}
            <code className="font-mono text-xs">beforeunload</code>.
          </Callout>

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
              name="pageview"
              description="Visualização de página. Disparado automaticamente pelo tracker — manual só se necessário."
              variant="secondary"
              props={[]}
            />

            <EventCard
              name="payment"
              description="Pagamento confirmado. Alimenta faturamento, margem, ticket médio e ROAS."
              variant="default"
              props={[
                {
                  name: "gross_value",
                  type: "number",
                  required: true,
                  description: "Valor bruto cobrado (em reais)",
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
                  description: "Taxa da gateway (em reais)",
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
              description="Início do checkout. Habilita detecção automática de abandono via beforeunload."
              variant="outline"
              props={[
                {
                  name: "gross_value",
                  type: "number",
                  description: "Valor no carrinho (em reais)",
                  example: "89.00",
                },
                {
                  name: "product_id",
                  type: "string",
                  description: "ID do produto",
                  example: "'template-001'",
                },
                {
                  name: "product_name",
                  type: "string",
                  description: "Nome do produto",
                  example: "'Convite Casamento'",
                },
              ]}
            />

            <EventCard
              name="checkout_abandoned"
              description="Checkout não concluído. Representa receita perdida no P&L. Pode ser disparado automaticamente."
              variant="destructive"
              props={[
                {
                  name: "gross_value",
                  type: "number",
                  description: "Valor que não converteu (em reais)",
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
                <code className="font-mono text-xs text-blue-600 dark:text-blue-400">
                  {attr}
                </code>
                <code className="font-mono text-xs text-green-600 dark:text-green-400">
                  {js}
                </code>
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

        {/* API Reference */}
        <TabsContent value="api" className="mt-0 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold tracking-tight">
                API Reference
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                POST /api/track
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Endpoint que recebe eventos do{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                tracker.js
              </code>
              . Pode ser chamado diretamente se necessário — por exemplo, para
              importar dados históricos ou disparar eventos server-side.
            </p>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/40 border-b border-border">
              <span>Limite</span>
              <span>Valor</span>
              <span>Comportamento ao exceder</span>
            </div>
            {[
              ["Rate limit", "1.000 req/min por API key", "HTTP 429"],
              ["Tamanho do payload", "64 KB", "HTTP 413"],
              [
                "Chaves em metadata",
                "20 chaves máximo",
                "Excedentes são descartados",
              ],
              [
                "Tamanho de string em metadata",
                "500 caracteres",
                "Truncado silenciosamente",
              ],
              [
                "Tipos aceitos em metadata",
                "string, number, boolean, null",
                "Outros tipos são descartados",
              ],
            ].map(([limit, value, behavior]) => (
              <div
                key={limit}
                className="grid grid-cols-3 text-sm px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20"
              >
                <span className="text-xs font-medium">{limit}</span>
                <code className="font-mono text-xs text-yellow-600 dark:text-yellow-400">
                  {value}
                </code>
                <span className="text-xs text-muted-foreground">
                  {behavior}
                </span>
              </div>
            ))}
          </div>

          <Callout type="tip">
            Valores monetários devem ser enviados em <strong>reais</strong> (ex:{" "}
            <code className="font-mono text-xs">150.00</code>). A API converte
            automaticamente para centavos antes de armazenar no banco.
          </Callout>

          <CodeBlock
            code={API_PAYLOAD_CODE}
            lang="http"
            title="Payload completo"
          />

          <div>
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
              Respostas
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5 bg-muted/40 border-b border-border">
                <span>Status</span>
                <span>Significado</span>
                <span>Descrição</span>
              </div>
              {API_RESPONSES_ROWS.map((row) => (
                <div
                  key={row.status}
                  className="grid grid-cols-3 text-sm px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <code
                    className={`font-mono text-xs font-semibold ${
                      row.status === "204"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {row.status}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {row.meaning}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Callout type="info">
            CORS está habilitado para qualquer origem (
            <code className="font-mono text-xs">
              Access-Control-Allow-Origin: *
            </code>
            ). Requests <code className="font-mono text-xs">OPTIONS</code> de
            preflight retornam <code className="font-mono text-xs">204</code>{" "}
            automaticamente.
          </Callout>
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
              Fila offline e estado da sessão
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use os comandos abaixo no DevTools para inspecionar o estado
              interno do tracker sem precisar disparar novos eventos.
            </p>
            <CodeBlock
              code={DEBUG_QUEUE_CODE}
              lang="js"
              title="DevTools — inspecionar estado"
            />
          </div>

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
