import type { ComponentType } from "react";
import {
  IconBrandNextjs,
  IconBrandReact,
  IconHtml,
  IconBrandVue,
  IconBrandAngular,
  IconBrandSvelte,
  IconBrandWordpress,
  IconTag,
  IconBrandNodejs,
  IconBrandPython,
  IconBrandPhp,
  IconBrandGolang,
  IconDiamond,
  IconBrandLaravel,
} from "@tabler/icons-react";
import { buildPrompt } from "@/app/[locale]/[slug]/settings/_components/ai-prompt-section";
import type { IFunnelStep } from "@/interfaces/organization.interface";

export type SdkCategory = "web" | "server";
export type StepBadge = "required" | "recommended" | "optional";

export interface TutorialStep {
  title: string;
  badge?: StepBadge;
  description?: string;
  file?: string;
  language?: string;
  code?: string;
  callout?: { title: string; body: string };
}

export interface SdkDefinition {
  id: string;
  name: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  category: SdkCategory;
}

export const SDK_LIST: SdkDefinition[] = [
  { id: "nextjs", name: "Next.js", icon: IconBrandNextjs, category: "web" },
  { id: "react", name: "React", icon: IconBrandReact, category: "web" },
  { id: "html", name: "HTML / JS", icon: IconHtml, category: "web" },
  { id: "vue", name: "Vue.js", icon: IconBrandVue, category: "web" },
  { id: "angular", name: "Angular", icon: IconBrandAngular, category: "web" },
  { id: "svelte", name: "Svelte", icon: IconBrandSvelte, category: "web" },
  { id: "wordpress", name: "WordPress", icon: IconBrandWordpress, category: "web" },
  { id: "gtm", name: "Google Tag Manager", icon: IconTag, category: "web" },
  { id: "nodejs", name: "Node.js", icon: IconBrandNodejs, category: "server" },
  { id: "python", name: "Python", icon: IconBrandPython, category: "server" },
  { id: "php", name: "PHP", icon: IconBrandPhp, category: "server" },
  { id: "go", name: "Go", icon: IconBrandGolang, category: "server" },
  { id: "ruby", name: "Ruby", icon: IconDiamond, category: "server" },
  { id: "laravel", name: "Laravel", icon: IconBrandLaravel, category: "server" },
];

export function getSdksByCategory(category: SdkCategory): SdkDefinition[] {
  return SDK_LIST.filter((sdk) => sdk.category === category);
}

interface TutorialContext {
  apiKey: string;
  baseUrl: string;
  t: (key: string) => string;
}

export function getTutorialSteps(
  sdkId: string,
  ctx: TutorialContext,
): TutorialStep[] {
  const { apiKey, baseUrl, t } = ctx;
  const scriptTag = `<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}"></script>`;
  const debugTag = `<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}" data-debug="true"></script>`;

  const c = (key: string) => t(`sdks.common.${key}`);

  switch (sdkId) {
    case "nextjs":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          description: c("addEnvVarDesc"),
          file: ".env.local",
          language: "bash",
          code: `NEXT_PUBLIC_GROWARE_KEY=${apiKey}`,
        },
        {
          title: c("installScript"),
          badge: "required",
          description: t("sdks.nextjs.installScriptDesc"),
          file: "app/layout.tsx",
          language: "tsx",
          code: `import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${baseUrl}/tracker.min.js"
          data-key={process.env.NEXT_PUBLIC_GROWARE_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}`,
          callout: {
            title: c("calloutAutoCapture"),
            body: c("calloutAutoCaptureBody"),
          },
        },
        {
          title: c("createHook"),
          badge: "recommended",
          description: t("sdks.nextjs.createHookDesc"),
          file: "hooks/use-tracker.ts",
          language: "ts",
          code: `'use client'

import { useCallback } from 'react'

function fireWhenReady(fn: () => void) {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => fn(), { timeout: 5000 })
  } else {
    setTimeout(fn, 1000)
  }
}

export function useTracker() {
  const track = useCallback((eventType: string, data?: Record<string, unknown>) => {
    fireWhenReady(() => {
      if ((window as any).Groware) (window as any).Groware.track(eventType, data)
    })
  }, [])

  const identify = useCallback((customerId: string, traits?: Record<string, unknown>) => {
    fireWhenReady(() => {
      if ((window as any).Groware) (window as any).Groware.identify(customerId, traits)
    })
  }, [])

  const reset = useCallback(() => {
    fireWhenReady(() => {
      if ((window as any).Groware) (window as any).Groware.reset()
    })
  }, [])

  return { track, identify, reset }
}`,
        },
        {
          title: c("identifyUsers"),
          badge: "recommended",
          description: t("sdks.nextjs.identifyUsersDesc"),
          file: "components/auth-handler.tsx",
          language: "tsx",
          code: `'use client'

import { useTracker } from '@/hooks/use-tracker'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

export function AuthHandler() {
  const { data: session } = useSession()
  const { identify, reset } = useTracker()

  useEffect(() => {
    if (session?.user?.id) {
      identify(session.user.id, {
        name: session.user.name,
        email: session.user.email,
      })
    } else {
      reset()
    }
  }, [session, identify, reset])

  return null
}`,
          callout: {
            title: c("calloutIdentifyWarning"),
            body: c("calloutIdentifyWarningBody"),
          },
        },
        {
          title: c("trackClientEvents"),
          badge: "required",
          description: t("sdks.nextjs.trackClientEventsDesc"),
          file: "components/signup-form.tsx",
          language: "tsx",
          code: `'use client'

import { useTracker } from '@/hooks/use-tracker'

export function SignupForm() {
  const { track } = useTracker()

  const handleSignup = async (formData: FormData) => {
    const user = await createUser(formData)

    // Fire signup event immediately after account creation
    track('signup', {
      dedupe: true,            // 1 signup per session (24h dedup)
      customer_id: user.id,
      customer_type: 'new',
    })
  }

  return <form action={handleSignup}>{/* form fields */}</form>
}

// In checkout page component:
export function CheckoutPage({ product, user }: Props) {
  const { track } = useTracker()

  // Fire when user initiates checkout (not on completion)
  useEffect(() => {
    track('checkout_started', {
      gross_value: product.price,
      currency: 'BRL',
      product_id: product.id,
      customer_id: user.id,
      // abandonment auto-detected on page unload
    })
  }, [])

  return <div>{/* checkout form */}</div>
}`,
          callout: {
            title: c("calloutResetOnLogout"),
            body: c("calloutResetOnLogoutBody"),
          },
        },
        {
          title: c("trackServerEvents"),
          badge: "required",
          description: t("sdks.nextjs.trackFunnelEventsDesc"),
          file: "app/checkout/actions.ts",
          language: "ts",
          code: `'use server'
// Server-side purchase event — call this from your payment webhook
// or in a server action after confirming payment
await fetch('${baseUrl}/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.GROWARE_API_KEY,
    event_type: 'purchase',
    dedupe_id: 'purchase:' + invoice.id, // prevents duplicates on retries
    event_time: invoice.paid_at,         // ISO 8601 — real payment time
    gross_value: invoice.amount,
    currency: 'BRL',
    customer_id: user.id,
    product_id: product.id,
    payment_method: 'pix',               // pix | credit_card | boleto
  }),
})`,
          callout: {
            title: c("calloutClientVsServer"),
            body: c("calloutClientVsServerBody"),
          },
        },
        {
          title: c("enableDebug"),
          badge: "optional",
          description: c("enableDebugDesc"),
          file: "app/layout.tsx",
          language: "tsx",
          code: `<Script
  src="${baseUrl}/tracker.min.js"
  data-key={process.env.NEXT_PUBLIC_GROWARE_KEY}
  data-debug="true"
  strategy="afterInteractive"
/>`,
          callout: {
            title: c("calloutDebug"),
            body: c("calloutDebugBody"),
          },
        },
        {
          title: c("validateInstall"),
          badge: "recommended",
          description: c("validateInstallDesc"),
          callout: {
            title: c("calloutValidateChecklist"),
            body: c("calloutValidateChecklistBody"),
          },
        },
      ];

    case "react":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          description: t("sdks.react.envVarDesc"),
          file: ".env.local",
          language: "bash",
          code: `# Vite (recommended)
VITE_GROWARE_KEY=${apiKey}

# Create React App
REACT_APP_GROWARE_KEY=${apiKey}`,
        },
        {
          title: c("installScript"),
          badge: "required",
          description: t("sdks.react.installScriptDesc"),
          file: "index.html",
          language: "html",
          code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
</head>
<body>
  <div id="root"></div>
  <!-- Place before closing body tag -->
  ${scriptTag}
</body>
</html>`,
          callout: {
            title: t("sdks.react.calloutViteEnvTitle"),
            body: t("sdks.react.calloutViteEnvDesc"),
          },
        },
        {
          title: c("createHook"),
          badge: "recommended",
          description: t("sdks.react.createHookDesc"),
          file: "src/hooks/use-tracker.ts",
          language: "ts",
          code: `import { useCallback } from 'react'

function fireWhenReady(fn: () => void) {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => fn(), { timeout: 5000 })
  } else {
    setTimeout(fn, 1000)
  }
}

export function useTracker() {
  const track = useCallback((eventType: string, data?: Record<string, unknown>) => {
    fireWhenReady(() => {
      if ((window as any).Groware) (window as any).Groware.track(eventType, data)
    })
  }, [])

  const identify = useCallback((customerId: string, traits?: Record<string, unknown>) => {
    fireWhenReady(() => {
      if ((window as any).Groware) (window as any).Groware.identify(customerId, traits)
    })
  }, [])

  const reset = useCallback(() => {
    fireWhenReady(() => {
      if ((window as any).Groware) (window as any).Groware.reset()
    })
  }, [])

  return { track, identify, reset }
}`,
        },
        {
          title: c("identifyUsers"),
          badge: "recommended",
          description: t("sdks.react.identifyUsersDesc"),
          file: "src/components/AuthProvider.tsx",
          language: "tsx",
          code: `import { useEffect } from 'react'
import { useTracker } from '../hooks/use-tracker'

export function AuthProvider({ user, children }: { user: User | null, children: React.ReactNode }) {
  const { identify, reset } = useTracker()

  useEffect(() => {
    if (user?.id) {
      identify(user.id, { name: user.name, email: user.email })
    } else {
      reset()
    }
  }, [user, identify, reset])

  return <>{children}</>
}`,
        },
        {
          title: c("trackClientEvents"),
          badge: "required",
          description: t("sdks.react.trackClientEventsDesc"),
          file: "src/components/FunnelEvents.tsx",
          language: "tsx",
          code: `import { useEffect } from 'react'
import { useTracker } from '../hooks/use-tracker'

// After signup
export function SignupSuccess({ user }: { user: User }) {
  const { track } = useTracker()

  useEffect(() => {
    track('signup', {
      dedupe: true,           // 1 signup per session (24h dedup)
      customer_id: user.id,
      customer_type: 'new',
    })
  }, [])

  return null
}

// When checkout starts
export function CheckoutButton({ product, user }: Props) {
  const { track } = useTracker()

  const handleCheckout = () => {
    track('checkout_started', {
      gross_value: product.price,
      currency: 'BRL',
      product_id: product.id,
      customer_id: user.id,
      // abandonment auto-detected on page unload
    })
    // navigate to checkout...
  }

  return <button onClick={handleCheckout}>Comprar</button>
}`,
          callout: {
            title: c("calloutResetOnLogout"),
            body: c("calloutResetOnLogoutBody"),
          },
        },
        {
          title: c("trackServerEvents"),
          badge: "required",
          description: t("sdks.react.trackFunnelEventsDesc"),
          file: "src/api/webhooks/payment.ts",
          language: "ts",
          code: `// In your payment webhook handler (Express/Fastify/etc.)
export async function handlePaymentWebhook(req: Request, res: Response) {
  const invoice = parseWebhook(req)

  await fetch('${baseUrl}/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: process.env.GROWARE_API_KEY,
      event_type: 'purchase',
      dedupe_id: 'purchase:' + invoice.id, // prevents duplicates
      event_time: invoice.paid_at,          // ISO 8601
      gross_value: invoice.amount,
      currency: 'BRL',
      customer_id: invoice.customer_id,
      product_id: invoice.product_id,
      payment_method: invoice.payment_method,
    }),
  })

  res.status(200).json({ received: true })
}`,
          callout: {
            title: c("calloutClientVsServer"),
            body: c("calloutClientVsServerBody"),
          },
        },
        {
          title: c("validateInstall"),
          badge: "recommended",
          callout: {
            title: c("calloutValidateChecklist"),
            body: c("calloutValidateChecklistBody"),
          },
        },
      ];

    case "html":
      return [
        {
          title: c("installScript"),
          badge: "required",
          description: t("sdks.html.installScriptDesc"),
          file: "index.html",
          language: "html",
          code: `<head>
  <meta charset="UTF-8" />
  ${scriptTag}
</head>`,
          callout: {
            title: t("sdks.html.calloutAutoPageLoadTitle"),
            body: t("sdks.html.calloutAutoPageLoadBody"),
          },
        },
        {
          title: c("identifyUsers"),
          badge: "recommended",
          description: t("sdks.html.identifyUsersDesc"),
          file: "login.js",
          language: "js",
          code: `// After successful login
window.Groware.identify(user.id, {
  name: user.name,
  email: user.email,
  phone: user.phone, // optional
})

// On logout
window.Groware.reset()`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.html.trackPurchaseDesc"),
          file: "checkout.js",
          language: "js",
          code: `window.Groware.track('purchase', {
  dedupe: invoice.id,        // required: unique transaction ID
  gross_value: 150.00,       // required
  currency: 'BRL',           // required
  customer_id: user.id,      // required — never email or CPF
  discount: 10.00,           // optional
  payment_method: 'pix',     // pix | credit_card | boleto
  product_id: 'prod-001',    // optional but recommended
  customer_type: 'new',      // new | returning
})`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.html.trackOtherFunnelDesc"),
          file: "app.js",
          language: "js",
          code: `// User signup
window.Groware.track('signup', {
  dedupe: true,              // 1 signup per session (24h)
  customer_id: user.id,
  customer_type: 'new',
})

// Checkout initiated
window.Groware.track('checkout_started', {
  gross_value: 89.00,
  currency: 'BRL',
  product_id: product.id,
  customer_id: user.id,
  // abandonment auto-detected on page unload
})`,
        },
        {
          title: c("enableDebug"),
          badge: "optional",
          description: t("sdks.html.enableDebugDesc"),
          file: "index.html",
          language: "html",
          code: debugTag,
        },
      ];

    case "vue":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env.local",
          language: "bash",
          code: `VITE_GROWARE_KEY=${apiKey}`,
        },
        {
          title: c("installScript"),
          badge: "required",
          file: "index.html",
          language: "html",
          code: `<head>
  <meta charset="UTF-8" />
  ${scriptTag}
</head>`,
        },
        {
          title: t("sdks.vue.createComposableTitle"),
          badge: "recommended",
          description: t("sdks.vue.createComposableDesc"),
          file: "src/composables/useGroware.ts",
          language: "ts",
          code: `import { getCurrentInstance } from 'vue'

declare global {
  interface Window { Groware?: { track: Function; identify: Function; reset: Function } }
}

function whenReady(fn: () => void) {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => fn(), { timeout: 5000 })
  } else {
    setTimeout(fn, 1000)
  }
}

export function useGroware() {
  const track = (eventType: string, data?: Record<string, unknown>) => {
    whenReady(() => window.Groware?.track(eventType, data))
  }

  const identify = (customerId: string, traits?: Record<string, unknown>) => {
    whenReady(() => window.Groware?.identify(customerId, traits))
  }

  const reset = () => {
    whenReady(() => window.Groware?.reset())
  }

  return { track, identify, reset }
}`,
        },
        {
          title: c("identifyUsers"),
          badge: "recommended",
          description: t("sdks.vue.identifyUsersDesc"),
          file: "src/stores/auth.ts",
          language: "ts",
          code: `import { defineStore } from 'pinia'
import { useGroware } from '@/composables/useGroware'

export const useAuthStore = defineStore('auth', {
  actions: {
    async login(credentials: Credentials) {
      const user = await authService.login(credentials)
      const { identify } = useGroware()
      identify(user.id, { name: user.name, email: user.email })
      return user
    },
    logout() {
      const { reset } = useGroware()
      reset()
    },
  },
})`,
        },
        {
          title: c("trackClientEvents"),
          badge: "required",
          description: t("sdks.vue.trackFunnelEventsDesc"),
          file: "src/components/CheckoutForm.vue",
          language: "vue",
          code: `<script setup lang="ts">
import { useGroware } from '@/composables/useGroware'
const { track } = useGroware()
const props = defineProps<{ product: Product; user: User }>()

// After signup
function handleSignupSuccess(user: User) {
  track('signup', {
    dedupe: true,
    customer_id: user.id,
    customer_type: 'new',
  })
}

// When checkout starts
function handleCheckoutStart(invoice: Invoice) {
  track('checkout_started', {
    gross_value: props.product.price,
    currency: 'BRL',
    product_id: props.product.id,
    customer_id: props.user.id,
  })
}

// On confirmed purchase (client-side, e.g. PIX QR displayed)
function handlePurchase(invoice: Invoice) {
  track('purchase', {
    dedupe: invoice.id,
    gross_value: invoice.amount,
    currency: 'BRL',
    customer_id: props.user.id,
    product_id: props.product.id,
  })
}
</script>`,
          callout: {
            title: c("calloutClientVsServer"),
            body: c("calloutClientVsServerBody"),
          },
        },
        {
          title: c("validateInstall"),
          badge: "recommended",
          callout: {
            title: c("calloutValidateChecklist"),
            body: c("calloutValidateChecklistBody"),
          },
        },
      ];

    case "angular":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: "src/environments/environment.ts",
          language: "ts",
          code: `export const environment = {
  production: false,
  growareKey: '${apiKey}',
}`,
        },
        {
          title: c("installScript"),
          badge: "required",
          file: "src/index.html",
          language: "html",
          code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${scriptTag}
</head>
<body>
  <app-root></app-root>
</body>
</html>`,
        },
        {
          title: t("sdks.angular.createServiceTitle"),
          badge: "recommended",
          description: t("sdks.angular.createServiceDesc"),
          file: "src/app/core/groware.service.ts",
          language: "ts",
          code: `import { Injectable } from '@angular/core'

declare global {
  interface Window { Groware?: { track: Function; identify: Function; reset: Function } }
}

@Injectable({ providedIn: 'root' })
export class GrowareService {
  private whenReady(fn: () => void) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => fn(), { timeout: 5000 })
    } else {
      setTimeout(fn, 1000)
    }
  }

  track(eventType: string, data?: Record<string, unknown>) {
    this.whenReady(() => window.Groware?.track(eventType, data))
  }

  identify(customerId: string, traits?: Record<string, unknown>) {
    this.whenReady(() => window.Groware?.identify(customerId, traits))
  }

  reset() {
    this.whenReady(() => window.Groware?.reset())
  }
}`,
        },
        {
          title: c("identifyUsers"),
          badge: "recommended",
          description: t("sdks.angular.identifyUsersDesc"),
          file: "src/app/auth/auth.service.ts",
          language: "ts",
          code: `import { Injectable } from '@angular/core'
import { GrowareService } from '../core/groware.service'

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private groware: GrowareService) {}

  login(user: User) {
    this.groware.identify(user.id, { name: user.name, email: user.email })
  }

  logout() {
    this.groware.reset()
  }
}`,
        },
        {
          title: c("trackClientEvents"),
          badge: "required",
          description: t("sdks.angular.trackFunnelEventsDesc"),
          file: "src/app/checkout/checkout.component.ts",
          language: "ts",
          code: `import { Component, OnInit } from '@angular/core'
import { GrowareService } from '../core/groware.service'

@Component({ selector: 'app-checkout', templateUrl: './checkout.component.html' })
export class CheckoutComponent implements OnInit {
  constructor(private groware: GrowareService) {}

  // After signup
  onSignup(user: User) {
    this.groware.track('signup', {
      dedupe: true,
      customer_id: user.id,
      customer_type: 'new',
    })
  }

  // When checkout starts
  ngOnInit() {
    this.groware.track('checkout_started', {
      gross_value: this.product.price,
      currency: 'BRL',
      product_id: this.product.id,
      customer_id: this.user.id,
    })
  }

  // On confirmed purchase
  onPurchaseComplete(invoice: Invoice, user: User) {
    this.groware.track('purchase', {
      dedupe: invoice.id,
      gross_value: invoice.amount,
      currency: 'BRL',
      customer_id: user.id,
    })
  }
}`,
          callout: {
            title: c("calloutClientVsServer"),
            body: c("calloutClientVsServerBody"),
          },
        },
        {
          title: c("validateInstall"),
          badge: "recommended",
          callout: {
            title: c("calloutValidateChecklist"),
            body: c("calloutValidateChecklistBody"),
          },
        },
      ];

    case "svelte":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env",
          language: "bash",
          code: `PUBLIC_GROWARE_KEY=${apiKey}`,
        },
        {
          title: c("installScript"),
          badge: "required",
          file: "src/app.html",
          language: "html",
          code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${scriptTag}
  %sveltekit.head%
</head>
<body data-sveltekit-preload-data="hover">
  %sveltekit.body%
</body>
</html>`,
        },
        {
          title: t("sdks.svelte.createUtilTitle"),
          badge: "recommended",
          description: t("sdks.svelte.createUtilDesc"),
          file: "src/lib/groware.ts",
          language: "ts",
          code: `declare global {
  interface Window { Groware?: { track: Function; identify: Function; reset: Function } }
}

function whenReady(fn: () => void) {
  if (typeof window === 'undefined') return
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => fn(), { timeout: 5000 })
  } else {
    setTimeout(fn, 1000)
  }
}

export const groware = {
  track(eventType: string, data?: Record<string, unknown>) {
    whenReady(() => window.Groware?.track(eventType, data))
  },
  identify(customerId: string, traits?: Record<string, unknown>) {
    whenReady(() => window.Groware?.identify(customerId, traits))
  },
  reset() {
    whenReady(() => window.Groware?.reset())
  },
}`,
        },
        {
          title: c("identifyUsers"),
          badge: "recommended",
          description: t("sdks.svelte.identifyUsersDesc"),
          file: "src/routes/auth/+page.svelte",
          language: "svelte",
          code: `<script lang="ts">
  import { groware } from '$lib/groware'

  async function handleLogin() {
    const user = await login(form)
    groware.identify(user.id, { name: user.name, email: user.email })
  }

  function handleLogout() {
    groware.reset()
  }
</script>`,
        },
        {
          title: c("trackClientEvents"),
          badge: "required",
          description: t("sdks.svelte.trackFunnelEventsDesc"),
          file: "src/routes/checkout/+page.svelte",
          language: "svelte",
          code: `<script lang="ts">
  import { onMount } from 'svelte'
  import { groware } from '$lib/groware'
  import type { PageData } from './$types'
  export let data: PageData

  // Fire checkout_started when page mounts
  onMount(() => {
    groware.track('checkout_started', {
      gross_value: data.product.price,
      currency: 'BRL',
      product_id: data.product.id,
      customer_id: data.user.id,
      // abandonment auto-detected on page unload
    })
  })

  // Fire purchase on confirmation
  function handlePurchase(invoice: Invoice) {
    groware.track('purchase', {
      dedupe: invoice.id,
      gross_value: invoice.amount,
      currency: 'BRL',
      customer_id: data.user.id,
      product_id: data.product.id,
    })
  }
</script>

<!-- After signup (+page.svelte) -->
<script lang="ts">
  import { groware } from '$lib/groware'
  export let user: User

  // Fire signup event once
  groware.track('signup', {
    dedupe: true,
    customer_id: user.id,
    customer_type: 'new',
  })
</script>`,
          callout: {
            title: c("calloutClientVsServer"),
            body: c("calloutClientVsServerBody"),
          },
        },
        {
          title: c("validateInstall"),
          badge: "recommended",
          callout: {
            title: c("calloutValidateChecklist"),
            body: c("calloutValidateChecklistBody"),
          },
        },
      ];

    case "wordpress":
      return [
        {
          title: c("installScript"),
          badge: "required",
          description: t("sdks.wordpress.installScriptDesc"),
          file: "functions.php",
          language: "php",
          code: `<?php
function groware_tracker_script() {
  echo '<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}"></script>';
}
add_action('wp_head', 'groware_tracker_script', 1); // priority 1 = loads early`,
          callout: {
            title: t("sdks.wordpress.calloutPluginTitle"),
            body: t("sdks.wordpress.calloutPluginBody"),
          },
        },
        {
          title: c("identifyUsers"),
          badge: "recommended",
          description: t("sdks.wordpress.identifyUsersDesc"),
          file: "functions.php",
          language: "php",
          code: `<?php
function groware_identify_user() {
  if (!is_user_logged_in()) return;
  $user = wp_get_current_user();
  echo "<script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.Groware) {
        window.Groware.identify('" . $user->ID . "', {
          name: '" . esc_js($user->display_name) . "',
          email: '" . esc_js($user->user_email) . "'
        });
      }
    });
  </script>";
}
add_action('wp_footer', 'groware_identify_user');`,
          callout: {
            title: t("sdks.wordpress.calloutUserIdTitle"),
            body: t("sdks.wordpress.calloutUserIdBody"),
          },
        },
        {
          title: t("sdks.wordpress.trackWooTitle"),
          badge: "recommended",
          description: t("sdks.wordpress.trackWooDesc"),
          file: "functions.php",
          language: "php",
          code: `<?php
function groware_track_woo_purchase($order_id) {
  $order = wc_get_order($order_id);
  if (!$order) return;
  echo "<script>
    if (window.Groware) {
      window.Groware.track('purchase', {
        dedupe: 'order:" . $order_id . "',
        gross_value: " . $order->get_total() . ",
        currency: '" . get_woocommerce_currency() . "',
        customer_id: '" . $order->get_customer_id() . "',
        payment_method: '" . esc_js($order->get_payment_method()) . "',
      });
    }
  </script>";
}
add_action('woocommerce_thankyou', 'groware_track_woo_purchase');`,
        },
        {
          title: c("enableDebug"),
          badge: "optional",
          description: t("sdks.wordpress.enableDebugDesc"),
          file: "functions.php",
          language: "php",
          code: `<?php
function groware_tracker_script() {
  // Remove data-debug="true" in production
  echo '<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}" data-debug="true"></script>';
}`,
        },
      ];

    case "gtm":
      return [
        {
          title: t("sdks.gtm.createTagTitle"),
          badge: "required",
          description: t("sdks.gtm.createTagDesc"),
          file: "GTM → Tags → New Tag",
          language: "html",
          code: `<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}"></script>`,
          callout: {
            title: t("sdks.gtm.calloutTagOrderTitle"),
            body: t("sdks.gtm.calloutTagOrderBody"),
          },
        },
        {
          title: t("sdks.gtm.configureTriggerTitle"),
          badge: "required",
          description: t("sdks.gtm.configureTriggerDesc"),
          callout: {
            title: t("sdks.gtm.calloutTriggerSettingsTitle"),
            body: t("sdks.gtm.calloutTriggerSettingsBody"),
          },
        },
        {
          title: t("sdks.gtm.createEventTagTitle"),
          badge: "required",
          description: t("sdks.gtm.createEventTagDesc"),
          file: "GTM → Tags → New Tag (Purchase)",
          language: "html",
          code: `<script>
  if (window.Groware) {
    window.Groware.track('purchase', {
      dedupe: {{DL - Invoice ID}},
      gross_value: {{DL - Order Total}},
      currency: 'BRL',
      customer_id: {{DL - Customer ID}},
      product_id: {{DL - Product ID}},
    });
  }
</script>`,
        },
        {
          title: t("sdks.gtm.pushFromAppTitle"),
          badge: "required",
          description: t("sdks.gtm.pushFromAppDesc"),
          file: "checkout.js",
          language: "js",
          code: `window.dataLayer = window.dataLayer || [];

// On purchase complete
window.dataLayer.push({
  event: 'groware_purchase',
  invoiceId: invoice.id,
  orderTotal: invoice.amount,
  customerId: user.id,
  productId: product.id,
});`,
        },
        {
          title: t("sdks.gtm.createVariablesTitle"),
          badge: "required",
          description: t("sdks.gtm.createVariablesDesc"),
          callout: {
            title: t("sdks.gtm.calloutVariablesTitle"),
            body: t("sdks.gtm.calloutVariablesBody"),
          },
        },
        {
          title: t("sdks.gtm.previewPublishTitle"),
          badge: "required",
          description: t("sdks.gtm.previewPublishDesc"),
          callout: {
            title: t("sdks.gtm.calloutPreviewTitle"),
            body: t("sdks.gtm.calloutPreviewBody"),
          },
        },
      ];

    case "nodejs":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: t("sdks.nodejs.createModuleTitle"),
          badge: "recommended",
          description: t("sdks.nodejs.createModuleDesc"),
          file: "src/lib/groware.ts",
          language: "ts",
          code: `const GROWARE_URL = process.env.GROWARE_BASE_URL + '/api/track'
const GROWARE_KEY = process.env.GROWARE_API_KEY!

interface TrackPayload {
  event_type: string
  dedupe_id?: string
  event_time?: string  // ISO 8601 — use for historical data
  gross_value?: number
  currency?: string
  customer_id?: string
  product_id?: string
  billing_type?: 'one_time' | 'recurring'
  billing_interval?: 'monthly' | 'yearly' | 'weekly'
  subscription_id?: string
  plan_id?: string
  payment_method?: string
  reason?: string
  [key: string]: unknown
}

export async function growareTrack(payload: TrackPayload): Promise<void> {
  try {
    await fetch(GROWARE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: GROWARE_KEY, ...payload }),
    })
  } catch {
    // never throw — tracking must not break your app
  }
}`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.server.trackPurchaseDesc"),
          file: "src/routes/webhooks/payment.ts",
          language: "ts",
          code: `import { growareTrack } from '../../lib/groware'

export async function handlePaymentWebhook(req: Request) {
  const invoice = await parseWebhook(req)

  await growareTrack({
    event_type: 'purchase',
    dedupe_id: 'purchase:' + invoice.id,   // REQUIRED — prevents duplicates
    event_time: invoice.created_at,         // ISO 8601 — real payment time
    gross_value: invoice.amount,
    currency: 'BRL',
    customer_id: invoice.customer_id,       // your internal UUID
    product_id: invoice.product_id,
    payment_method: invoice.payment_method, // pix | credit_card | boleto
  })

  return new Response(null, { status: 200 })
}`,
        },
        {
          title: t("sdks.server.trackRecurringTitle"),
          badge: "recommended",
          description: t("sdks.server.trackRecurringDesc"),
          file: "src/routes/webhooks/subscription.ts",
          language: "ts",
          code: `import { growareTrack } from '../../lib/groware'

// Monthly renewal
await growareTrack({
  event_type: 'purchase',
  dedupe_id: 'renewal:' + invoice.id,
  event_time: invoice.paid_at,
  gross_value: invoice.amount,
  currency: 'BRL',
  billing_type: 'recurring',
  billing_interval: 'monthly',
  subscription_id: subscription.id,
  plan_id: subscription.plan_id,
  customer_id: subscription.customer_id,
})

// Cancellation
await growareTrack({
  event_type: 'subscription_canceled',
  dedupe_id: 'canceled:' + subscription.id,
  event_time: subscription.canceled_at,
  subscription_id: subscription.id,
  gross_value: subscription.price,
  currency: 'BRL',
  billing_interval: 'monthly',
  reason: 'payment_failed', // user_canceled | payment_failed | upgraded | downgraded
  customer_id: subscription.customer_id,
})`,
        },
        {
          title: c("validateWithCurl"),
          badge: "recommended",
          file: "terminal",
          language: "bash",
          code: `curl -X POST ${baseUrl}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'`,
        },
      ];

    case "python":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: t("sdks.python.createModuleTitle"),
          badge: "recommended",
          description: t("sdks.python.createModuleDesc"),
          file: "app/services/groware.py",
          language: "python",
          code: `import os
import logging
from typing import Optional, Any
import requests

GROWARE_URL = os.environ['GROWARE_BASE_URL'] + '/api/track'
GROWARE_KEY = os.environ['GROWARE_API_KEY']

logger = logging.getLogger(__name__)

def groware_track(
    event_type: str,
    customer_id: Optional[str] = None,
    dedupe_id: Optional[str] = None,
    event_time: Optional[str] = None,  # ISO 8601
    **kwargs: Any,
) -> None:
    """Send an event to Groware. Never raises — tracking must not break your app."""
    try:
        payload = {
            'key': GROWARE_KEY,
            'event_type': event_type,
            **kwargs,
        }
        if customer_id:
            payload['customer_id'] = customer_id
        if dedupe_id:
            payload['dedupe_id'] = dedupe_id
        if event_time:
            payload['event_time'] = event_time

        requests.post(GROWARE_URL, json=payload, timeout=5)
    except Exception as e:
        logger.warning('Groware tracking failed: %s', e)`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.server.trackPurchaseDesc"),
          file: "app/views/webhooks.py",
          language: "python",
          code: `from app.services.groware import groware_track

def payment_webhook(request):
    invoice = parse_webhook(request)

    groware_track(
        event_type='purchase',
        dedupe_id=f'purchase:{invoice.id}',  # REQUIRED
        event_time=invoice.created_at.isoformat(),
        gross_value=float(invoice.amount),
        currency='BRL',
        customer_id=str(invoice.customer_id),
        product_id=str(invoice.product_id),
        payment_method=invoice.payment_method,
    )

    return HttpResponse(status=200)`,
        },
        {
          title: t("sdks.server.trackRecurringTitle"),
          badge: "recommended",
          file: "app/views/webhooks.py",
          language: "python",
          code: `# Recurring renewal
groware_track(
    event_type='purchase',
    dedupe_id=f'renewal:{invoice.id}',
    event_time=invoice.paid_at.isoformat(),
    gross_value=float(invoice.amount),
    currency='BRL',
    billing_type='recurring',
    billing_interval='monthly',
    subscription_id=str(subscription.id),
    plan_id=str(subscription.plan_id),
    customer_id=str(subscription.customer_id),
)

# Cancellation
groware_track(
    event_type='subscription_canceled',
    dedupe_id=f'canceled:{subscription.id}',
    subscription_id=str(subscription.id),
    gross_value=float(subscription.price),
    currency='BRL',
    billing_interval='monthly',
    reason='user_canceled',
    customer_id=str(subscription.customer_id),
)`,
        },
        {
          title: t("sdks.python.asyncVariantTitle"),
          badge: "optional",
          description: t("sdks.python.asyncVariantDesc"),
          file: "app/services/groware_async.py",
          language: "python",
          code: `import httpx
import os

async def groware_track_async(event_type: str, **kwargs) -> None:
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                os.environ['GROWARE_BASE_URL'] + '/api/track',
                json={'key': os.environ['GROWARE_API_KEY'], 'event_type': event_type, **kwargs},
                timeout=5,
            )
    except Exception:
        pass  # never raise`,
        },
        {
          title: c("validateWithCurl"),
          badge: "recommended",
          file: "terminal",
          language: "bash",
          code: `curl -X POST ${baseUrl}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'`,
        },
      ];

    case "php":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: t("sdks.php.createModuleTitle"),
          badge: "recommended",
          description: t("sdks.php.createModuleDesc"),
          file: "app/Services/Groware.php",
          language: "php",
          code: `<?php

class Groware
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey  = getenv('GROWARE_API_KEY') ?: '${apiKey}';
        $this->baseUrl = getenv('GROWARE_BASE_URL') ?: '${baseUrl}';
    }

    public function track(string $eventType, array $payload = []): void
    {
        $payload = array_merge(['key' => $this->apiKey, 'event_type' => $eventType], $payload);

        try {
            $ch = curl_init($this->baseUrl . '/api/track');
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS     => json_encode($payload),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 5,
            ]);
            curl_exec($ch);
            curl_close($ch);
        } catch (\\Throwable) {
            // never throw — tracking must not break your app
        }
    }
}`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.server.trackPurchaseDesc"),
          file: "app/Controllers/WebhookController.php",
          language: "php",
          code: `<?php

use App\\Services\\Groware;

class WebhookController
{
    public function handlePayment(Request $request): Response
    {
        $invoice = $this->parseWebhook($request);
        $groware = new Groware();

        $groware->track('purchase', [
            'dedupe_id'      => 'purchase:' . $invoice->id,  // REQUIRED
            'event_time'     => $invoice->created_at->format('c'),
            'gross_value'    => (float) $invoice->amount,
            'currency'       => 'BRL',
            'customer_id'    => (string) $invoice->customer_id,
            'product_id'     => (string) $invoice->product_id,
            'payment_method' => $invoice->payment_method,
        ]);

        return response(null, 200);
    }
}`,
        },
        {
          title: t("sdks.server.trackRecurringTitle"),
          badge: "recommended",
          file: "app/Controllers/WebhookController.php",
          language: "php",
          code: `<?php
// Renewal
$groware->track('purchase', [
    'dedupe_id'          => 'renewal:' . $invoice->id,
    'event_time'         => $invoice->paid_at->format('c'),
    'gross_value'        => (float) $invoice->amount,
    'currency'           => 'BRL',
    'billing_type'       => 'recurring',
    'billing_interval'   => 'monthly',
    'subscription_id'    => (string) $subscription->id,
    'plan_id'            => (string) $subscription->plan_id,
    'customer_id'        => (string) $subscription->customer_id,
]);

// Cancellation
$groware->track('subscription_canceled', [
    'dedupe_id'        => 'canceled:' . $subscription->id,
    'subscription_id'  => (string) $subscription->id,
    'gross_value'      => (float) $subscription->price,
    'currency'         => 'BRL',
    'billing_interval' => 'monthly',
    'reason'           => 'payment_failed',
    'customer_id'      => (string) $subscription->customer_id,
]);`,
        },
        {
          title: c("validateWithCurl"),
          badge: "recommended",
          file: "terminal",
          language: "bash",
          code: `curl -X POST ${baseUrl}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'`,
        },
      ];

    case "go":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: t("sdks.go.createModuleTitle"),
          badge: "recommended",
          description: t("sdks.go.createModuleDesc"),
          file: "internal/groware/groware.go",
          language: "go",
          code: `package groware

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type Payload map[string]any

var client = &http.Client{Timeout: 5 * time.Second}

func Track(eventType string, payload Payload) {
	payload["key"] = os.Getenv("GROWARE_API_KEY")
	payload["event_type"] = eventType

	body, err := json.Marshal(payload)
	if err != nil {
		return
	}

	url := os.Getenv("GROWARE_BASE_URL") + "/api/track"
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("groware: track failed: %v", err)
		return
	}
	defer resp.Body.Close()
}`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.server.trackPurchaseDesc"),
          file: "internal/handlers/webhook.go",
          language: "go",
          code: `package handlers

import (
	"myapp/internal/groware"
	"net/http"
)

func HandlePaymentWebhook(w http.ResponseWriter, r *http.Request) {
	invoice := parseWebhook(r)

	groware.Track("purchase", groware.Payload{
		"dedupe_id":      "purchase:" + invoice.ID, // REQUIRED
		"event_time":     invoice.CreatedAt.Format(time.RFC3339),
		"gross_value":    invoice.Amount,
		"currency":       "BRL",
		"customer_id":    invoice.CustomerID,
		"product_id":     invoice.ProductID,
		"payment_method": invoice.PaymentMethod,
	})

	w.WriteHeader(http.StatusOK)
}`,
        },
        {
          title: t("sdks.server.trackRecurringTitle"),
          badge: "recommended",
          file: "internal/handlers/subscription_webhook.go",
          language: "go",
          code: `groware.Track("purchase", groware.Payload{
    "dedupe_id":        "renewal:" + invoice.ID,
    "event_time":       invoice.PaidAt.Format(time.RFC3339),
    "gross_value":      invoice.Amount,
    "currency":         "BRL",
    "billing_type":     "recurring",
    "billing_interval": "monthly",
    "subscription_id":  subscription.ID,
    "plan_id":          subscription.PlanID,
    "customer_id":      subscription.CustomerID,
})`,
        },
        {
          title: c("validateWithCurl"),
          badge: "recommended",
          file: "terminal",
          language: "bash",
          code: `curl -X POST ${baseUrl}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'`,
        },
      ];

    case "ruby":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: t("sdks.ruby.createModuleTitle"),
          badge: "recommended",
          description: t("sdks.ruby.createModuleDesc"),
          file: "lib/groware.rb",
          language: "ruby",
          code: `require 'net/http'
require 'json'
require 'uri'

module Groware
  BASE_URL = ENV.fetch('GROWARE_BASE_URL', '${baseUrl}')
  API_KEY  = ENV.fetch('GROWARE_API_KEY', '${apiKey}')

  def self.track(event_type, payload = {})
    uri  = URI("\#{BASE_URL}/api/track")
    body = payload.merge(key: API_KEY, event_type: event_type)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    http.open_timeout = 5
    http.read_timeout = 5

    request = Net::HTTP::Post.new(uri.path, 'Content-Type' => 'application/json')
    request.body = body.to_json
    http.request(request)
  rescue StandardError => e
    Rails.logger.warn("Groware tracking failed: \#{e.message}") if defined?(Rails)
  end
end`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.server.trackPurchaseDesc"),
          file: "app/controllers/webhooks_controller.rb",
          language: "ruby",
          code: `class WebhooksController < ApplicationController
  def payment
    invoice = parse_webhook(request)

    Groware.track('purchase',
      dedupe_id:      "purchase:\#{invoice.id}",  # REQUIRED
      event_time:     invoice.created_at.iso8601,
      gross_value:    invoice.amount.to_f,
      currency:       'BRL',
      customer_id:    invoice.customer_id.to_s,
      product_id:     invoice.product_id.to_s,
      payment_method: invoice.payment_method,
    )

    head :ok
  end
end`,
        },
        {
          title: t("sdks.server.trackRecurringTitle"),
          badge: "recommended",
          file: "app/controllers/webhooks_controller.rb",
          language: "ruby",
          code: `# Renewal
Groware.track('purchase',
  dedupe_id:        "renewal:\#{invoice.id}",
  event_time:       invoice.paid_at.iso8601,
  gross_value:      invoice.amount.to_f,
  currency:         'BRL',
  billing_type:     'recurring',
  billing_interval: 'monthly',
  subscription_id:  subscription.id.to_s,
  plan_id:          subscription.plan_id.to_s,
  customer_id:      subscription.customer_id.to_s,
)`,
        },
        {
          title: c("validateWithCurl"),
          badge: "recommended",
          file: "terminal",
          language: "bash",
          code: `curl -X POST ${baseUrl}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'`,
        },
      ];

    case "laravel":
      return [
        {
          title: c("addEnvVar"),
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: t("sdks.laravel.createServiceTitle"),
          badge: "recommended",
          description: t("sdks.laravel.createServiceDesc"),
          file: "app/Services/GrowareService.php",
          language: "php",
          code: `<?php

namespace App\\Services;

use Illuminate\\Support\\Facades\\Http;
use Illuminate\\Support\\Facades\\Log;

class GrowareService
{
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey  = config('services.groware.key', env('GROWARE_API_KEY'));
        $this->baseUrl = config('services.groware.url', env('GROWARE_BASE_URL', '${baseUrl}'));
    }

    public function track(string $eventType, array $payload = []): void
    {
        try {
            Http::timeout(5)->post($this->baseUrl . '/api/track', array_merge(
                ['key' => $this->apiKey, 'event_type' => $eventType],
                $payload,
            ));
        } catch (\\Throwable $e) {
            Log::warning('Groware tracking failed', ['error' => $e->getMessage()]);
        }
    }
}`,
        },
        {
          title: c("bindServiceProvider"),
          badge: "recommended",
          description: c("bindServiceProviderDesc"),
          file: "app/Providers/AppServiceProvider.php",
          language: "php",
          code: `<?php

use App\\Services\\GrowareService;

public function register(): void
{
    $this->app->singleton(GrowareService::class);
}`,
        },
        {
          title: c("trackFunnelEvents"),
          badge: "required",
          description: t("sdks.server.trackPurchaseDesc"),
          file: "app/Http/Controllers/WebhookController.php",
          language: "php",
          code: `<?php

namespace App\\Http\\Controllers;

use App\\Services\\GrowareService;
use Illuminate\\Http\\Request;

class WebhookController extends Controller
{
    public function __construct(private GrowareService $groware) {}

    public function handlePayment(Request $request): \\Illuminate\\Http\\Response
    {
        $invoice = $this->parseWebhook($request);

        $this->groware->track('purchase', [
            'dedupe_id'      => 'purchase:' . $invoice->id,  // REQUIRED
            'event_time'     => $invoice->created_at->toIso8601String(),
            'gross_value'    => (float) $invoice->amount,
            'currency'       => 'BRL',
            'customer_id'    => (string) $invoice->customer_id,
            'product_id'     => (string) $invoice->product_id,
            'payment_method' => $invoice->payment_method,
        ]);

        return response(null, 200);
    }
}`,
        },
        {
          title: t("sdks.server.trackRecurringTitle"),
          badge: "recommended",
          file: "app/Http/Controllers/WebhookController.php",
          language: "php",
          code: `<?php
// Renewal (Stripe/Asaas invoice.paid webhook)
$this->groware->track('purchase', [
    'dedupe_id'        => 'renewal:' . $invoice->id,
    'event_time'       => $invoice->paid_at->toIso8601String(),
    'gross_value'      => (float) $invoice->amount,
    'currency'         => 'BRL',
    'billing_type'     => 'recurring',
    'billing_interval' => 'monthly',
    'subscription_id'  => (string) $subscription->id,
    'plan_id'          => (string) $subscription->plan_id,
    'customer_id'      => (string) $subscription->customer_id,
]);

// Cancellation
$this->groware->track('subscription_canceled', [
    'dedupe_id'        => 'canceled:' . $subscription->id,
    'subscription_id'  => (string) $subscription->id,
    'gross_value'      => (float) $subscription->price,
    'currency'         => 'BRL',
    'billing_interval' => 'monthly',
    'reason'           => 'payment_failed',
    'customer_id'      => (string) $subscription->customer_id,
]);`,
        },
        {
          title: c("validateWithCurl"),
          badge: "recommended",
          file: "terminal",
          language: "bash",
          code: `curl -X POST ${baseUrl}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'`,
        },
      ];

    default:
      return [
        {
          title: c("installScript"),
          badge: "required",
          file: "index.html",
          language: "html",
          code: `<head>\n  ${scriptTag}\n</head>`,
        },
      ];
  }
}

interface SdkPromptContext {
  apiKey: string;
  baseUrl: string;
  orgName: string;
  currency: string;
  funnelSteps: IFunnelStep[];
  hasRecurringRevenue: boolean;
}

function getSdkInstallSection(sdkId: string, apiKey: string, baseUrl: string): string {
  const scriptTag = `<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}"></script>`;

  const sections: Record<string, string> = {
    nextjs: `════════════════════════════════════════════
INSTALAÇÃO — NEXT.JS (App Router)
════════════════════════════════════════════
1. Adicione ao .env.local:
   NEXT_PUBLIC_GROWARE_KEY=${apiKey}

2. No layout raiz (app/layout.tsx), use next/script:
   import Script from 'next/script'
   <Script src="${baseUrl}/tracker.min.js" data-key={process.env.NEXT_PUBLIC_GROWARE_KEY} strategy="afterInteractive" />

3. Crie o hook hooks/use-tracker.ts com useCallback + requestIdleCallback para chamar window.Groware com segurança.

4. Chame identify(user.id, { name, email }) após login. Chame reset() no logout.

5. Eventos server-side (compras, renovações) via fetch POST para ${baseUrl}/api/track usando process.env.GROWARE_API_KEY.`,

    react: `════════════════════════════════════════════
INSTALAÇÃO — REACT
════════════════════════════════════════════
1. Adicione VITE_GROWARE_KEY=${apiKey} ao .env.local

2. Adicione o script ao index.html antes do </body>:
   ${scriptTag}

3. Crie src/hooks/use-tracker.ts com useCallback + requestIdleCallback.

4. Chame identify(user.id, ...) após login. reset() no logout.`,

    vue: `════════════════════════════════════════════
INSTALAÇÃO — VUE.JS
════════════════════════════════════════════
1. Adicione VITE_GROWARE_KEY=${apiKey} ao .env.local

2. Adicione o script ao index.html:
   ${scriptTag}

3. Crie src/composables/useGroware.ts com whenReady() + window.Groware?.track/identify/reset.

4. Chame identify(user.id, ...) no login action (Pinia store).`,

    angular: `════════════════════════════════════════════
INSTALAÇÃO — ANGULAR
════════════════════════════════════════════
1. Adicione ao src/environments/environment.ts: growareKey: '${apiKey}'

2. Adicione o script ao src/index.html:
   ${scriptTag}

3. Crie GrowareService (@Injectable({ providedIn: 'root' })) com track/identify/reset.

4. Injete GrowareService no AuthService e chame identify após login.`,

    svelte: `════════════════════════════════════════════
INSTALAÇÃO — SVELTEKIT
════════════════════════════════════════════
1. Adicione PUBLIC_GROWARE_KEY=${apiKey} ao .env

2. Adicione o script ao src/app.html:
   ${scriptTag}

3. Crie src/lib/groware.ts com export const groware = { track, identify, reset }.

4. Chame groware.identify(user.id, ...) após login.`,

    html: `════════════════════════════════════════════
INSTALAÇÃO — HTML/JS VANILLA
════════════════════════════════════════════
1. Adicione ao <head> de TODAS as páginas:
   ${scriptTag}

2. Após login: window.Groware.identify(user.id, { name, email })
3. No logout: window.Groware.reset()`,

    wordpress: `════════════════════════════════════════════
INSTALAÇÃO — WORDPRESS
════════════════════════════════════════════
1. Em functions.php:
   add_action('wp_head', function() { echo '${scriptTag}'; }, 1);

2. Para identificar usuários logados, adicione ao wp_footer:
   if (is_user_logged_in()) { /* window.Groware.identify(userId, ...) */ }`,

    gtm: `════════════════════════════════════════════
INSTALAÇÃO — GOOGLE TAG MANAGER
════════════════════════════════════════════
1. Crie uma Custom HTML Tag com o script: ${scriptTag}
   Trigger: All Pages. Tag Sequencing: fire first.

2. Para eventos personalizados, crie Custom HTML Tags ativadas por eventos dataLayer.

3. No código do site: window.dataLayer.push({ event: 'groware_purchase', ... })`,

    nodejs: `════════════════════════════════════════════
INSTALAÇÃO — NODE.JS (SERVER-SIDE)
════════════════════════════════════════════
1. .env: GROWARE_API_KEY=${apiKey}, GROWARE_BASE_URL=${baseUrl}

2. Crie src/lib/groware.ts com função growareTrack() usando fetch.
   Sempre use dedupe_id para prevenir duplicatas.

3. Chame growareTrack() nos webhooks de pagamento.
   Use event_time (ISO 8601) para passar a data real do evento.`,

    python: `════════════════════════════════════════════
INSTALAÇÃO — PYTHON (SERVER-SIDE)
════════════════════════════════════════════
1. .env: GROWARE_API_KEY=${apiKey}, GROWARE_BASE_URL=${baseUrl}

2. Crie app/services/groware.py com função groware_track() usando requests ou httpx.

3. Chame nos webhooks de pagamento com dedupe_id obrigatório.`,

    php: `════════════════════════════════════════════
INSTALAÇÃO — PHP (SERVER-SIDE)
════════════════════════════════════════════
1. .env: GROWARE_API_KEY=${apiKey}, GROWARE_BASE_URL=${baseUrl}

2. Crie app/Services/Groware.php com método track() usando cURL.

3. Chame nos controllers de webhook com dedupe_id obrigatório.`,

    go: `════════════════════════════════════════════
INSTALAÇÃO — GO (SERVER-SIDE)
════════════════════════════════════════════
1. .env: GROWARE_API_KEY=${apiKey}, GROWARE_BASE_URL=${baseUrl}

2. Crie internal/groware/groware.go com func Track(eventType string, payload Payload).

3. Chame nos handlers de webhook com dedupe_id obrigatório.`,

    ruby: `════════════════════════════════════════════
INSTALAÇÃO — RUBY (SERVER-SIDE)
════════════════════════════════════════════
1. .env: GROWARE_API_KEY=${apiKey}, GROWARE_BASE_URL=${baseUrl}

2. Crie lib/groware.rb com module Groware + método track usando Net::HTTP.

3. Chame nos controllers de webhook com dedupe_id obrigatório.`,

    laravel: `════════════════════════════════════════════
INSTALAÇÃO — LARAVEL (SERVER-SIDE)
════════════════════════════════════════════
1. .env: GROWARE_API_KEY=${apiKey}, GROWARE_BASE_URL=${baseUrl}

2. Crie app/Services/GrowareService.php usando Http facade do Laravel.
   Registre como singleton no AppServiceProvider.

3. Injete GrowareService nos controllers de webhook. Use dedupe_id obrigatório.`,
  };

  return sections[sdkId] ?? sections["html"];
}

export function buildSdkPrompt(
  sdkId: string,
  ctx: SdkPromptContext,
): string {
  const { apiKey, baseUrl, orgName, currency, funnelSteps, hasRecurringRevenue } = ctx;
  const baseGenericPrompt = buildPrompt(apiKey, baseUrl, orgName, currency, funnelSteps, hasRecurringRevenue);
  const sdkSection = getSdkInstallSection(sdkId, apiKey, baseUrl);

  return `${baseGenericPrompt}

${sdkSection}`;
}
