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
}

export function getTutorialSteps(
  sdkId: string,
  ctx: TutorialContext,
): TutorialStep[] {
  const { apiKey, baseUrl } = ctx;
  const scriptTag = `<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}"></script>`;
  const debugTag = `<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}" data-debug="true"></script>`;

  switch (sdkId) {
    case "nextjs":
      return [
        {
          title: "Add environment variable",
          badge: "required",
          description: "Store your API key as an environment variable. Never hardcode it in source files.",
          file: ".env.local",
          language: "bash",
          code: `NEXT_PUBLIC_GROWARE_KEY=${apiKey}`,
        },
        {
          title: "Install the tracker script",
          badge: "required",
          description: "Add the script to your root layout using next/script with strategy afterInteractive. This ensures the tracker loads after the page is interactive without blocking rendering.",
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
            title: "Auto-captured events",
            body: "The tracker automatically captures: pageview on every route change (App Router compatible), UTMs from the URL, device type, referrer, and session ID. No extra code needed for these.",
          },
        },
        {
          title: "Create a useTracker hook",
          badge: "recommended",
          description: "Create a typed hook that wraps window.Groware safely. It uses requestIdleCallback so tracking never blocks user interactions.",
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
          title: "Identify users after login",
          badge: "recommended",
          description: "Call identify() right after the user authenticates to link their anonymous session to their profile. Call reset() on logout.",
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
            title: "Important: never use email as customer_id",
            body: "customer_id must be your internal UUID. Email, CPF, or name must never be used as identifiers. Pass them to identify() as traits instead.",
          },
        },
        {
          title: "Track funnel events",
          badge: "required",
          description: "Call track() at each step of your funnel. Place these calls in the exact server actions or client components where each action happens.",
          file: "app/checkout/actions.ts",
          language: "ts",
          code: `'use server'
// Server-side purchase event (webhooks, checkout completion)
await fetch('${baseUrl}/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: process.env.GROWARE_API_KEY,
    event_type: 'purchase',
    dedupe_id: 'purchase:' + invoice.id, // prevents duplicates
    gross_value: invoice.amount,
    currency: 'BRL',
    customer_id: user.id,
    product_id: product.id,
    payment_method: 'pix',
  }),
})`,
        },
        {
          title: "Enable debug mode",
          badge: "optional",
          description: "Add data-debug='true' to see all Groware events logged in the browser console. Remove before deploying to production.",
          file: "app/layout.tsx",
          language: "tsx",
          code: `<Script
  src="${baseUrl}/tracker.min.js"
  data-key={process.env.NEXT_PUBLIC_GROWARE_KEY}
  data-debug="true"
  strategy="afterInteractive"
/>`,
          callout: {
            title: "Debug output",
            body: "Open DevTools → Console and look for [Groware] logs. You'll see each event as it fires, including auto-captured pageviews and UTM data.",
          },
        },
        {
          title: "Validate the installation",
          badge: "recommended",
          description: "Test that events are arriving correctly before going live.",
          callout: {
            title: "Checklist",
            body: "1. Open your site with ?utm_source=test&utm_medium=cpc in the URL\n2. Open DevTools → Network → filter by '/api/track'\n3. Navigate pages — you should see POST requests returning 204\n4. Complete a funnel action (signup, checkout, etc.)\n5. Come back to this onboarding page — the verification card below will show 'Event detected!'",
          },
        },
      ];

    case "react":
      return [
        {
          title: "Add environment variable",
          badge: "required",
          description: "Store your API key as an environment variable. For Vite-based React projects use VITE_ prefix; for Create React App use REACT_APP_.",
          file: ".env.local",
          language: "bash",
          code: `# Vite (recommended)
VITE_GROWARE_KEY=${apiKey}

# Create React App
REACT_APP_GROWARE_KEY=${apiKey}`,
        },
        {
          title: "Add the tracker script",
          badge: "required",
          description: "Add the script tag to your index.html before the closing body tag. For Vite, reference the env var as a data attribute using a script in main.tsx instead.",
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
            title: "Using Vite env vars",
            body: "If you need the key from env, load it dynamically in main.tsx: document.querySelector('script[data-groware]')?.setAttribute('data-key', import.meta.env.VITE_GROWARE_KEY)",
          },
        },
        {
          title: "Create a useTracker hook",
          badge: "recommended",
          description: "A typed React hook that safely wraps window.Groware with requestIdleCallback to avoid blocking the main thread.",
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
          title: "Identify users after login",
          badge: "recommended",
          description: "Call identify() when the user logs in to link the anonymous session to their profile.",
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
          title: "Track funnel events",
          badge: "required",
          description: "Use the hook in your components to fire events at each funnel step.",
          file: "src/components/CheckoutButton.tsx",
          language: "tsx",
          code: `import { useTracker } from '../hooks/use-tracker'

export function CheckoutButton({ product, user }: Props) {
  const { track } = useTracker()

  const handleCheckout = () => {
    track('checkout_started', {
      gross_value: product.price,
      currency: 'BRL',
      product_id: product.id,
      customer_id: user.id,
    })
    // navigate to checkout
  }

  return <button onClick={handleCheckout}>Comprar</button>
}`,
        },
        {
          title: "Validate the installation",
          badge: "recommended",
          callout: {
            title: "Checklist",
            body: "1. Open your app with ?utm_source=test in the URL\n2. DevTools → Network → filter '/api/track' — should see 204 responses\n3. Complete a funnel action\n4. Return here and check the verification card below",
          },
        },
      ];

    case "html":
      return [
        {
          title: "Add the tracker script",
          badge: "required",
          description: "Paste this script in the <head> of every page. Load it early to capture UTMs from the initial URL.",
          file: "index.html",
          language: "html",
          code: `<head>
  <meta charset="UTF-8" />
  ${scriptTag}
</head>`,
          callout: {
            title: "Auto-captured on every page load",
            body: "pageview, utm_source, utm_medium, utm_campaign, referrer, device (mobile/desktop), and session ID are captured automatically with no extra code.",
          },
        },
        {
          title: "Identify users after login",
          badge: "recommended",
          description: "Call this right after your login logic completes. On logout, call reset() to clear the session.",
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
          title: "Track purchase events",
          badge: "required",
          description: "Fire this event when a purchase is confirmed. The dedupe field prevents double-counting if the page is reloaded.",
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
          title: "Track other funnel events",
          badge: "required",
          description: "Fire these at each key step of your funnel.",
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
          title: "Enable debug mode",
          badge: "optional",
          description: "Replace your script tag with the debug version to log events in the console.",
          file: "index.html",
          language: "html",
          code: debugTag,
        },
      ];

    case "vue":
      return [
        {
          title: "Add environment variable",
          badge: "required",
          file: ".env.local",
          language: "bash",
          code: `VITE_GROWARE_KEY=${apiKey}`,
        },
        {
          title: "Add the tracker script",
          badge: "required",
          description: "Add to index.html. For Nuxt, use the useHead composable in app.vue.",
          file: "index.html",
          language: "html",
          code: `<head>
  <meta charset="UTF-8" />
  ${scriptTag}
</head>`,
        },
        {
          title: "Create a useGroware composable",
          badge: "recommended",
          description: "A Vue 3 composable that wraps window.Groware safely for use across your components.",
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
          title: "Identify users after login",
          badge: "recommended",
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
          title: "Track funnel events",
          badge: "required",
          file: "src/components/CheckoutForm.vue",
          language: "vue",
          code: `<script setup lang="ts">
import { useGroware } from '@/composables/useGroware'
const { track } = useGroware()
const props = defineProps<{ product: Product; user: User }>()

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
        },
        {
          title: "Validate the installation",
          badge: "recommended",
          callout: {
            title: "Checklist",
            body: "1. Open your app with ?utm_source=test in the URL\n2. DevTools → Network → filter '/api/track'\n3. Navigate — pageview events should appear (204 responses)\n4. Complete a funnel action and return here",
          },
        },
      ];

    case "angular":
      return [
        {
          title: "Add environment variable",
          badge: "required",
          file: "src/environments/environment.ts",
          language: "ts",
          code: `export const environment = {
  production: false,
  growareKey: '${apiKey}',
}`,
        },
        {
          title: "Add the tracker script",
          badge: "required",
          description: "Add to src/index.html in the <head>. The tracker will auto-capture pageviews on Angular Router navigation.",
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
          title: "Create GrowareService",
          badge: "recommended",
          description: "An injectable Angular service that wraps window.Groware. Inject it anywhere in your app.",
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
          title: "Identify users after login",
          badge: "recommended",
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
          title: "Track funnel events",
          badge: "required",
          file: "src/app/checkout/checkout.component.ts",
          language: "ts",
          code: `import { Component } from '@angular/core'
import { GrowareService } from '../core/groware.service'

@Component({ selector: 'app-checkout', templateUrl: './checkout.component.html' })
export class CheckoutComponent {
  constructor(private groware: GrowareService) {}

  onPurchaseComplete(invoice: Invoice, user: User) {
    this.groware.track('purchase', {
      dedupe: invoice.id,
      gross_value: invoice.amount,
      currency: 'BRL',
      customer_id: user.id,
    })
  }
}`,
        },
        {
          title: "Validate the installation",
          badge: "recommended",
          callout: {
            title: "Checklist",
            body: "1. Open your app with ?utm_source=test\n2. DevTools → Network → filter '/api/track'\n3. Angular Router navigation should trigger pageview events\n4. Complete a funnel action and return here to verify",
          },
        },
      ];

    case "svelte":
      return [
        {
          title: "Add environment variable",
          badge: "required",
          file: ".env",
          language: "bash",
          code: `PUBLIC_GROWARE_KEY=${apiKey}`,
        },
        {
          title: "Add the tracker script",
          badge: "required",
          description: "Add to src/app.html for SvelteKit. Place it in <head> so UTMs are captured on the initial page load.",
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
          title: "Create a groware.ts utility",
          badge: "recommended",
          description: "A typed Svelte module that safely wraps window.Groware. Import and use anywhere in your app.",
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
          title: "Identify users after login",
          badge: "recommended",
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
          title: "Track funnel events",
          badge: "required",
          file: "src/routes/checkout/+page.svelte",
          language: "svelte",
          code: `<script lang="ts">
  import { groware } from '$lib/groware'
  import type { PageData } from './$types'
  export let data: PageData

  function handlePurchase(invoice: Invoice) {
    groware.track('purchase', {
      dedupe: invoice.id,
      gross_value: invoice.amount,
      currency: 'BRL',
      customer_id: data.user.id,
      product_id: data.product.id,
    })
  }
</script>`,
        },
        {
          title: "Validate the installation",
          badge: "recommended",
          callout: {
            title: "Checklist",
            body: "1. Open your app with ?utm_source=test\n2. DevTools → Network → filter '/api/track'\n3. SvelteKit client-side navigation triggers pageview automatically\n4. Fire a funnel event and return here",
          },
        },
      ];

    case "wordpress":
      return [
        {
          title: "Add the tracker via functions.php",
          badge: "required",
          description: "This is the recommended method. Add it to your theme's functions.php or a custom plugin. The tracker will load on all pages.",
          file: "functions.php",
          language: "php",
          code: `<?php
function groware_tracker_script() {
  echo '<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}"></script>';
}
add_action('wp_head', 'groware_tracker_script', 1); // priority 1 = loads early`,
          callout: {
            title: "Alternative: use a plugin",
            body: "You can also use a header/footer injection plugin like 'Insert Headers and Footers' to paste the script tag without touching code.",
          },
        },
        {
          title: "Identify logged-in users",
          badge: "recommended",
          description: "If users are logged in, identify them after the tracker loads so their events are attributed.",
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
            title: "User ID privacy",
            body: "Pass $user->ID (WordPress integer ID), never the email address, as the first argument to identify().",
          },
        },
        {
          title: "Track WooCommerce purchases",
          badge: "recommended",
          description: "Hook into WooCommerce's thank you page to fire the purchase event.",
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
          title: "Enable debug mode",
          badge: "optional",
          description: "Temporarily add data-debug='true' to see events in the browser console. Remove before going live.",
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
          title: "Create a Custom HTML Tag",
          badge: "required",
          description: "In GTM: Tags → New → Tag Configuration → Custom HTML. Paste the script below. Set trigger to 'All Pages'.",
          file: "GTM → Tags → New Tag",
          language: "html",
          code: `<script async src="${baseUrl}/tracker.min.js" data-key="${apiKey}"></script>`,
          callout: {
            title: "Tag firing order",
            body: "Set this tag to fire before all other tags (Tag Sequencing). This ensures UTMs from the URL are captured before any other tag runs.",
          },
        },
        {
          title: "Configure the trigger",
          badge: "required",
          description: "Set the trigger to 'All Pages - Page View' so the tracker loads on every page immediately.",
          callout: {
            title: "Trigger settings",
            body: "Go to Triggering → All Pages. This fires the tracker on every page load and SPA navigation captured by GTM.",
          },
        },
        {
          title: "Create a Custom Event Tag for purchases",
          badge: "required",
          description: "Create a separate Custom HTML Tag triggered by a custom event (e.g. 'groware_purchase') pushed to dataLayer from your app.",
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
          title: "Push events from your app",
          badge: "required",
          description: "In your frontend code, push to dataLayer to trigger the GTM tags.",
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
          title: "Create GTM Variables",
          badge: "required",
          description: "Create Data Layer Variables for each field used in the tags: DL - Invoice ID, DL - Order Total, DL - Customer ID, DL - Product ID.",
          callout: {
            title: "Variable setup",
            body: "Variables → New → Data Layer Variable. Set the name to match the dataLayer keys (e.g. 'invoiceId' for DL - Invoice ID). These map dataLayer values to your tag templates.",
          },
        },
        {
          title: "Preview and publish",
          badge: "required",
          description: "Use GTM Preview mode to verify events fire correctly before publishing.",
          callout: {
            title: "Testing steps",
            body: "1. Click Preview in GTM → enter your site URL\n2. Navigate pages — verify the Groware tag fires on 'All Pages'\n3. Complete a purchase — verify the purchase tag fires\n4. Check DevTools Network for POST /api/track returning 204\n5. Publish the container",
          },
        },
      ];

    case "nodejs":
      return [
        {
          title: "Add environment variable",
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: "Create a Groware client module",
          badge: "recommended",
          description: "A typed helper module so you don't repeat the fetch boilerplate everywhere. Place it in a shared utilities folder.",
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
          title: "Track purchase events",
          badge: "required",
          description: "Call growareTrack() in your payment webhook handler. Always use dedupe_id to prevent double-counting.",
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
          title: "Track recurring subscriptions",
          badge: "recommended",
          description: "For SaaS with recurring revenue, track renewals and cancellations server-side from webhook handlers.",
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
          title: "Validate with cURL",
          badge: "recommended",
          description: "Test your API key with a manual cURL request before deploying.",
          file: "terminal",
          language: "bash",
          code: `curl -X POST ${baseUrl}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'

# Expected response: HTTP 204 No Content`,
        },
      ];

    case "python":
      return [
        {
          title: "Add environment variable",
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: "Create a groware.py module",
          badge: "recommended",
          description: "A reusable module using requests (sync) or httpx (async). Place in your project's utils or services directory.",
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
          title: "Track purchase events",
          badge: "required",
          description: "Call groware_track() in your payment webhook view. Use dedupe_id to prevent double-counting from webhook retries.",
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
          title: "Track recurring subscriptions",
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
          title: "Async variant (httpx)",
          badge: "optional",
          description: "For async frameworks like FastAPI or Django Async, use httpx instead of requests.",
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
          title: "Validate with cURL",
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
          title: "Add environment variable",
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: "Create a Groware.php class",
          badge: "recommended",
          description: "A reusable class using cURL. Place it in your app's Services or Helpers directory.",
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
          title: "Track purchase events",
          badge: "required",
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
          title: "Track recurring subscriptions",
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
          title: "Validate with cURL",
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
          title: "Add environment variable",
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: "Create a groware.go package",
          badge: "recommended",
          description: "A typed Go package that handles the HTTP request. Import it from any handler.",
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
          title: "Track purchase events",
          badge: "required",
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
          title: "Track recurring subscriptions",
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
          title: "Validate with cURL",
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
          title: "Add environment variable",
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: "Create a Groware module",
          badge: "recommended",
          description: "A reusable Ruby module. Place it in lib/ or app/services/ depending on your framework.",
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
          title: "Track purchase events",
          badge: "required",
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
          title: "Track recurring subscriptions",
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
          title: "Validate with cURL",
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
          title: "Add environment variable",
          badge: "required",
          file: ".env",
          language: "bash",
          code: `GROWARE_API_KEY=${apiKey}
GROWARE_BASE_URL=${baseUrl}`,
        },
        {
          title: "Create GrowareService",
          badge: "recommended",
          description: "A typed Laravel service using Http facade. Register it in a service provider or use dependency injection.",
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
          title: "Bind in AppServiceProvider",
          badge: "recommended",
          description: "Register GrowareService as a singleton so it's shared across the request lifecycle.",
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
          title: "Track purchase events",
          badge: "required",
          description: "Inject GrowareService into your webhook controller and call track() on payment confirmation.",
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
          title: "Track recurring subscriptions",
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
          title: "Validate with cURL",
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
          title: "Add the tracker script",
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
