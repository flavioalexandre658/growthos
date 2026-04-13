import { baseEmailLayout, ctaButton, divider, founderSignoff, unsubscribeFooter, type Locale } from "./base-layout";

export type DashboardEmptyEmailId =
  | "dashboard_empty_4h"
  | "dashboard_empty_48h"
  | "dashboard_empty_5d";

export interface ISequenceDashboardEmptyEmailParams {
  emailId: DashboardEmptyEmailId;
  userName: string;
  orgName: string;
  stripeUrl: string;
  asaasUrl: string;
  trackerUrl: string;
  unsubscribeUrl: string;
  locale?: Locale;
}

const translations = {
  pt: {
    dashboard_empty_4h: {
      subject: "O caminho mais rápido: conecte seu gateway em 2 minutos",
      greeting: (name: string) => `Oi, ${name},`,
      body: (orgName: string) =>
        `Seu dashboard do <strong style="color:#d4d4d8;">${orgName}</strong> está pronto — mas ainda sem dados.`,
      subBody:
        "O jeito mais rápido de ver seus números: conecte seu gateway de pagamento (Stripe, Kiwify, Hotmart, Asaas ou outro). Em 2 minutos seu histórico completo de pagamentos, assinaturas e MRR aparece no dashboard.",
      ctaStripe: "Conectar Stripe →",
      ctaAsaas: "Conectar Asaas →",
      ctaTracker: "Prefiro instalar o tracker.js primeiro →",
      previewText: "O caminho mais rápido: conecte seu gateway em 2 minutos",
    },
    dashboard_empty_48h: {
      subject: "Como ver seu MRR real em 3 minutos",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "Quer ver seu MRR real em 3 minutos? É simples assim:",
      steps: [
        "Vá em <strong style=\"color:#d4d4d8;\">Configurações → Integrações</strong>",
        "Cole as <strong style=\"color:#d4d4d8;\">credenciais do seu gateway favorito</strong>",
        "Clique <strong style=\"color:#d4d4d8;\">Conectar</strong>",
        "Aguarde ~2 minutos enquanto importamos seu histórico",
        "Pronto — MRR, churn, receita e assinaturas no dashboard",
      ],
      cta: "Conectar agora →",
      previewText: "Como ver seu MRR real em 3 minutos",
    },
    dashboard_empty_5d: {
      subject: "Tracker.js ou Gateway — qual é melhor para você?",
      greeting: (name: string) => `Oi, ${name},`,
      body: () => "Queria tirar uma dúvida que muitos empreendedores têm: qual integração começar primeiro?",
      modes: [
        {
          title: "Gateway de pagamento",
          desc: "Importa pagamentos, assinaturas, MRR automaticamente. Ótimo se você quer ver dados financeiros rápido.",
        },
        {
          title: "Tracker.js",
          desc: "Rastreia funil, canais de aquisição, landing pages. Ótimo se você quer entender de onde vem seu tráfego.",
        },
        {
          title: "Os dois juntos",
          desc: "Experiência completa — receita atribuída por canal de origem.",
        },
      ],
      ctaGateway: "Conectar gateway →",
      ctaTracker: "Instalar tracker.js →",
      previewText: "Tracker.js ou Gateway — qual é melhor para você?",
    },
  },
  en: {
    dashboard_empty_4h: {
      subject: "The fastest path: connect your gateway in 2 minutes",
      greeting: (name: string) => `Hi ${name},`,
      body: (orgName: string) =>
        `Your <strong style="color:#d4d4d8;">${orgName}</strong> dashboard is ready — but still without data.`,
      subBody:
        "The fastest way to see your numbers: connect your payment gateway (Stripe, Kiwify, Hotmart, Asaas, or another). In 2 minutes your full history of payments, subscriptions, and MRR will appear in the dashboard.",
      ctaStripe: "Connect Stripe →",
      ctaAsaas: "Connect Asaas →",
      ctaTracker: "I'd rather install tracker.js first →",
      previewText: "The fastest path: connect your gateway in 2 minutes",
    },
    dashboard_empty_48h: {
      subject: "How to see your real MRR in 3 minutes",
      greeting: (name: string) => `Hi ${name},`,
      body: () => "Want to see your real MRR in 3 minutes? It's this simple:",
      steps: [
        "Go to <strong style=\"color:#d4d4d8;\">Settings → Integrations</strong>",
        "Paste the <strong style=\"color:#d4d4d8;\">credentials from your favorite gateway</strong>",
        "Click <strong style=\"color:#d4d4d8;\">Connect</strong>",
        "Wait ~2 minutes while we import your history",
        "Done — MRR, churn, revenue and subscriptions in the dashboard",
      ],
      cta: "Connect now →",
      previewText: "How to see your real MRR in 3 minutes",
    },
    dashboard_empty_5d: {
      subject: "Tracker.js or Gateway — which is better for you?",
      greeting: (name: string) => `Hi ${name},`,
      body: () => "I wanted to answer a question many entrepreneurs have: which integration to start with?",
      modes: [
        {
          title: "Payment gateway",
          desc: "Imports payments, subscriptions, MRR automatically. Great if you want to see financial data quickly.",
        },
        {
          title: "Tracker.js",
          desc: "Tracks funnel, acquisition channels, landing pages. Great if you want to understand where your traffic comes from.",
        },
        {
          title: "Both together",
          desc: "Complete experience — revenue attributed by acquisition channel.",
        },
      ],
      ctaGateway: "Connect gateway →",
      ctaTracker: "Install tracker.js →",
      previewText: "Tracker.js or Gateway — which is better for you?",
    },
  },
} as const;

export function sequenceDashboardEmptyEmail(
  params: ISequenceDashboardEmptyEmailParams,
): string {
  const { emailId, userName, orgName, stripeUrl, asaasUrl, trackerUrl, unsubscribeUrl } = params;
  const locale = params.locale ?? "pt";

  if (emailId === "dashboard_empty_4h") {
    const t = translations[locale].dashboard_empty_4h;
    const content = `
      <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:20px; line-height:1.5;">
        ${t.greeting(userName)}
      </p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.body(orgName)}
      </p>
      ${divider()}
      <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:24px;">
        ${t.subBody}
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:12px;">
        <tr>
          <td style="padding-right:8px;">
            ${ctaButton(t.ctaStripe, stripeUrl)}
          </td>
          <td>
            ${ctaButton(t.ctaAsaas, asaasUrl)}
          </td>
        </tr>
      </table>
      <p style="margin-top:16px; text-align:center;">
        <a href="${trackerUrl}" style="color:#71717a; font-size:12px; text-decoration:underline;">${t.ctaTracker}</a>
      </p>
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText);
  }

  if (emailId === "dashboard_empty_48h") {
    const t = translations[locale].dashboard_empty_48h;
    const content = `
      <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:20px; line-height:1.5;">
        ${t.greeting(userName)}
      </p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.body()}
      </p>
      ${divider()}
      <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:8px;">
        ${t.steps.map((step, i) => `
        <tr>
          <td style="padding:0 0 10px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%; background:#09090b; border:1px solid #27272a; border-radius:10px; padding:14px 18px;">
              <tr>
                <td style="width:28px; vertical-align:top; padding-top:1px;">
                  <div style="width:22px; height:22px; background:#1e1b4b; border:1px solid #312e81; border-radius:6px; text-align:center; line-height:22px; color:#818cf8; font-size:12px; font-weight:700;">${i + 1}</div>
                </td>
                <td style="padding-left:12px; color:#a1a1aa; font-size:13px; line-height:1.6;">${step}</td>
              </tr>
            </table>
          </td>
        </tr>
        `).join("")}
      </table>
      ${ctaButton(t.cta, stripeUrl)}
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText);
  }

  const t = translations[locale].dashboard_empty_5d;
  const content = `
    <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:20px; line-height:1.5;">
      ${t.greeting(userName)}
    </p>
    <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${t.body()}
    </p>
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:8px;">
      ${t.modes.map((mode) => `
      <tr>
        <td style="padding:0 0 10px 0;">
          <table cellpadding="0" cellspacing="0" style="width:100%; background:#09090b; border:1px solid #27272a; border-radius:10px; padding:16px 20px;">
            <tr>
              <td>
                <p style="color:#e4e4e7; font-size:13px; font-weight:600; margin:0 0 4px;">${mode.title}</p>
                <p style="color:#71717a; font-size:12px; margin:0; line-height:1.5;">${mode.desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `).join("")}
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%; margin-top:8px;">
      <tr>
        <td style="padding-right:8px;">
          ${ctaButton(t.ctaGateway, stripeUrl)}
        </td>
        <td>
          ${ctaButton(t.ctaTracker, trackerUrl)}
        </td>
      </tr>
    </table>
    ${founderSignoff(locale)}
    ${unsubscribeFooter(unsubscribeUrl, locale)}
  `;
  return baseEmailLayout(content, locale, t.previewText);
}

export function getDashboardEmptySubject(
  emailId: DashboardEmptyEmailId,
  locale: Locale,
): string {
  return translations[locale][emailId].subject;
}
