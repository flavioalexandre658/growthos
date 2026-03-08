import { baseEmailLayout, ctaButton, divider, founderSignoff, unsubscribeFooter, type Locale } from "./base-layout";

export type TrackerOnlyEmailId = "tracker_only_48h" | "tracker_only_5d";

export interface ISequenceTrackerOnlyEmailParams {
  emailId: TrackerOnlyEmailId;
  userName: string;
  totalPageviews?: number;
  totalSignups?: number;
  gatewayUrl: string;
  unsubscribeUrl: string;
  locale?: Locale;
}

const translations = {
  pt: {
    tracker_only_48h: {
      subject: "Seu funil está rodando. Agora conecte a receita",
      greeting: (name: string) => `Oi, ${name},`,
      body: (pageviews: number, signups: number) =>
        `O Groware já rastreou <strong style="color:#d4d4d8;">${pageviews.toLocaleString("pt-BR")} visitas</strong> e <strong style="color:#d4d4d8;">${signups.toLocaleString("pt-BR")} cadastros</strong> no seu site.`,
      subBody:
        "Mas sem um gateway conectado, as telas de Recorrência e P&L ficam incompletas.",
      subBody2:
        "Conecte seu Stripe ou Asaas e veja MRR, churn, LTV e receita por canal — tudo automático.",
      cta: "Conectar gateway →",
      previewText: "Seu funil está rodando. Agora conecte a receita",
    },
    tracker_only_5d: {
      subject: "MRR, Churn, LTV — tudo automático com uma API key",
      greeting: (name: string) => `Oi, ${name},`,
      body: () => "Uma API key do Stripe ou Asaas desbloqueia tudo isso no seu dashboard:",
      features: [
        "Tela completa de Recorrência (MRR, ARR, ARPU, LTV, Churn)",
        "P&L automático com receita real",
        "Análise da nossa IA com contexto financeiro",
        "Histórico completo de pagamentos e assinaturas",
      ],
      cta: "Conectar em 2 minutos →",
      previewText: "MRR, Churn, LTV — tudo automático com uma API key",
    },
  },
  en: {
    tracker_only_48h: {
      subject: "Your funnel is running. Now connect the revenue",
      greeting: (name: string) => `Hi ${name},`,
      body: (pageviews: number, signups: number) =>
        `Groware has already tracked <strong style="color:#d4d4d8;">${pageviews.toLocaleString("en-US")} visits</strong> and <strong style="color:#d4d4d8;">${signups.toLocaleString("en-US")} sign-ups</strong> on your site.`,
      subBody:
        "But without a connected gateway, the Recurring Revenue and P&L screens remain incomplete.",
      subBody2:
        "Connect your Stripe or Asaas and see MRR, churn, LTV, and revenue by channel — all automatic.",
      cta: "Connect gateway →",
      previewText: "Your funnel is running. Now connect the revenue",
    },
    tracker_only_5d: {
      subject: "MRR, Churn, LTV — all automatic with one API key",
      greeting: (name: string) => `Hi ${name},`,
      body: () => "One Stripe or Asaas API key unlocks all of this in your dashboard:",
      features: [
        "Full Recurring Revenue screen (MRR, ARR, ARPU, LTV, Churn)",
        "Automatic P&L with real revenue",
        "AI analysis with financial context",
        "Full history of payments and subscriptions",
      ],
      cta: "Connect in 2 minutes →",
      previewText: "MRR, Churn, LTV — all automatic with one API key",
    },
  },
} as const;

export function sequenceTrackerOnlyEmail(
  params: ISequenceTrackerOnlyEmailParams,
): string {
  const { emailId, userName, totalPageviews = 0, totalSignups = 0, gatewayUrl, unsubscribeUrl } = params;
  const locale = params.locale ?? "pt";

  if (emailId === "tracker_only_48h") {
    const t = translations[locale].tracker_only_48h;
    const content = `
      <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:20px; line-height:1.5;">
        ${t.greeting(userName)}
      </p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.body(totalPageviews, totalSignups)}
      </p>
      ${divider()}
      <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:14px;">
        ${t.subBody}
      </p>
      <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.subBody2}
      </p>
      ${ctaButton(t.cta, gatewayUrl)}
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText);
  }

  const t = translations[locale].tracker_only_5d;
  const content = `
    <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:20px; line-height:1.5;">
      ${t.greeting(userName)}
    </p>
    <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${t.body()}
    </p>
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:8px;">
      ${t.features.map((feature) => `
      <tr>
        <td style="padding:0 0 8px 0;">
          <table cellpadding="0" cellspacing="0" style="width:100%; background:#09090b; border:1px solid #27272a; border-radius:8px; padding:12px 16px;">
            <tr>
              <td style="width:20px; vertical-align:top; color:#818cf8; font-size:14px;">→</td>
              <td style="padding-left:8px; color:#a1a1aa; font-size:13px; line-height:1.5;">${feature}</td>
            </tr>
          </table>
        </td>
      </tr>
      `).join("")}
    </table>
    ${ctaButton(t.cta, gatewayUrl)}
    ${founderSignoff(locale)}
    ${unsubscribeFooter(unsubscribeUrl, locale)}
  `;
  return baseEmailLayout(content, locale, t.previewText);
}

export function getTrackerOnlySubject(
  emailId: TrackerOnlyEmailId,
  locale: Locale,
): string {
  return translations[locale][emailId].subject;
}
