import { baseEmailLayout, ctaButton, divider, founderSignoff, unsubscribeFooter, type Locale } from "./base-layout";

export type InactiveEmailId = "inactive_14d" | "inactive_21d" | "inactive_30d";

export interface ISequenceInactiveEmailParams {
  emailId: InactiveEmailId;
  userName: string;
  orgName: string;
  dashboardUrl: string;
  comparativeUrl: string;
  significantChange?: string;
  periodRevenue?: string;
  newSubscribers?: number;
  churnRate?: string;
  unsubscribeUrl: string;
  locale?: Locale;
}

const translations = {
  pt: {
    inactive_14d: {
      subject: "Algo mudou no seu negócio esta semana",
      greeting: (name: string) => `Oi, ${name},`,
      defaultChange: "Seu MRR teve uma variação significativa nas últimas duas semanas",
      body: (change: string) =>
        `Notei uma mudança no seu negócio: <strong style="color:#d4d4d8;">${change}</strong>.`,
      subBody:
        "Acesse o dashboard para ver o quadro completo e entender o que está por trás dessa variação.",
      cta: "Ver o que mudou →",
      previewText: "Algo mudou no seu negócio esta semana",
    },
    inactive_21d: {
      subject: "3 semanas de dados esperando por você",
      greeting: (name: string) => `Oi, ${name},`,
      body: (revenue: string, newSubs: number, churn: string) =>
        `Nas últimas 3 semanas: receita <strong style="color:#d4d4d8;">${revenue}</strong>, <strong style="color:#d4d4d8;">${newSubs}</strong> novos assinantes, churn <strong style="color:#d4d4d8;">${churn}</strong>.`,
      subBody: "Quer ver como esses números se comparam com as 3 semanas anteriores?",
      cta: "Abrir comparativo →",
      previewText: "3 semanas de dados esperando por você",
    },
    inactive_30d: {
      subject: "Seu dashboard ainda está rodando",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "O Groware continua coletando seus dados em segundo plano. Quando quiser voltar, está tudo lá.",
      subBody:
        "Se algo não funcionou como você esperava, me conta respondendo esse email — quero melhorar.",
      cta: "Voltar ao dashboard →",
      feedbackLabel: "Me contar o que faltou",
      previewText: "Seu dashboard ainda está rodando",
    },
  },
  en: {
    inactive_14d: {
      subject: "Something changed in your business this week",
      greeting: (name: string) => `Hi ${name},`,
      defaultChange: "Your MRR had a significant variation in the last two weeks",
      body: (change: string) =>
        `I noticed a change in your business: <strong style="color:#d4d4d8;">${change}</strong>.`,
      subBody:
        "Open the dashboard to see the full picture and understand what's behind this variation.",
      cta: "See what changed →",
      previewText: "Something changed in your business this week",
    },
    inactive_21d: {
      subject: "3 weeks of data waiting for you",
      greeting: (name: string) => `Hi ${name},`,
      body: (revenue: string, newSubs: number, churn: string) =>
        `Over the last 3 weeks: revenue <strong style="color:#d4d4d8;">${revenue}</strong>, <strong style="color:#d4d4d8;">${newSubs}</strong> new subscribers, churn <strong style="color:#d4d4d8;">${churn}</strong>.`,
      subBody: "Want to see how those numbers compare to the previous 3 weeks?",
      cta: "Open comparison →",
      previewText: "3 weeks of data waiting for you",
    },
    inactive_30d: {
      subject: "Your dashboard is still running",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "Groware keeps collecting your data in the background. When you want to come back, everything is there.",
      subBody:
        "If something didn't work as you expected, let me know by replying to this email — I want to improve.",
      cta: "Back to dashboard →",
      feedbackLabel: "Tell me what was missing",
      previewText: "Your dashboard is still running",
    },
  },
} as const;

export function sequenceInactiveEmail(
  params: ISequenceInactiveEmailParams,
): string {
  const {
    emailId,
    userName,
    orgName,
    dashboardUrl,
    comparativeUrl,
    significantChange,
    periodRevenue = "R$ 0,00",
    newSubscribers = 0,
    churnRate = "0%",
    unsubscribeUrl,
  } = params;
  const locale = params.locale ?? "pt";

  if (emailId === "inactive_14d") {
    const t = translations[locale].inactive_14d;
    const change = significantChange ?? t.defaultChange;
    const content = `
      <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:4px; line-height:1.5;">
        ${t.greeting(userName)}
      </p>
      <p style="color:#52525b; font-size:12px; margin-bottom:20px;">${orgName}</p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.body(change)}
      </p>
      ${divider()}
      <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.subBody}
      </p>
      ${ctaButton(t.cta, dashboardUrl)}
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText);
  }

  if (emailId === "inactive_21d") {
    const t = translations[locale].inactive_21d;
    const content = `
      <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:4px; line-height:1.5;">
        ${t.greeting(userName)}
      </p>
      <p style="color:#52525b; font-size:12px; margin-bottom:20px;">${orgName}</p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.body(periodRevenue, newSubscribers, churnRate)}
      </p>
      ${divider()}
      <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.subBody}
      </p>
      ${ctaButton(t.cta, comparativeUrl)}
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText);
  }

  const t = translations[locale].inactive_30d;
  const content = `
    <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:4px; line-height:1.5;">
      ${t.greeting(userName)}
    </p>
    <p style="color:#52525b; font-size:12px; margin-bottom:20px;">${orgName}</p>
    <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${t.body()}
    </p>
    ${divider()}
    <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${t.subBody}
    </p>
    ${ctaButton(t.cta, dashboardUrl)}
    <p style="text-align:center; margin-top:12px;">
      <a href="mailto:flavio@groware.io" style="color:#71717a; font-size:12px; text-decoration:underline;">
        ${t.feedbackLabel}
      </a>
    </p>
    ${founderSignoff(locale)}
    ${unsubscribeFooter(unsubscribeUrl, locale)}
  `;
  return baseEmailLayout(content, locale, t.previewText);
}

export function getInactiveSubject(
  emailId: InactiveEmailId,
  locale: Locale,
): string {
  return translations[locale][emailId].subject;
}
