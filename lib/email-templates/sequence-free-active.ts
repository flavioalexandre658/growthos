import { baseEmailLayout, ctaButton, divider, founderSignoff, unsubscribeFooter, type Locale } from "./base-layout";

export type FreeActiveEmailId =
  | "free_active_14d"
  | "free_active_21d"
  | "free_active_limit_reached"
  | "free_active_30d";

export interface ISequenceFreeActiveEmailParams {
  emailId: FreeActiveEmailId;
  userName: string;
  orgName: string;
  plansUrl: string;
  upgradeUrl: string;
  accessCount?: number;
  limitedResource?: string;
  unsubscribeUrl: string;
  locale?: Locale;
}

const translations = {
  pt: {
    free_active_14d: {
      subject: (count: number) => `Você já usou o Groware ${count} vezes este mês`,
      greeting: (name: string) => `Oi, ${name},`,
      body: (count: number) =>
        `Você acessou o Groware <strong style="color:#d4d4d8;">${count} vezes</strong> este mês — ótimo ritmo.`,
      subBody: "Para continuar crescendo com mais profundidade, o plano Starter desbloqueia:",
      features: [
        "14 gateways integrados (Stripe, Kiwify, Hotmart, Asaas, PayPal e mais)",
        "Análise da nossa IA ilimitada",
        "Comparativo entre períodos",
        "Suporte prioritário",
      ],
      cta: "Ver planos →",
      previewText: (count: number) => `Você já usou o Groware ${count} vezes este mês`,
    },
    free_active_21d: {
      subject: "Quanto custa não saber seu lucro real?",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "A maioria dos empreendedores descobre custos escondidos quando configura o P&L completo pela primeira vez.",
      subBody:
        "Com o plano Starter, o Groware calcula seu lucro real automaticamente — receita menos todos os seus custos, sem planilha.",
      cta: "Experimentar o Starter →",
      previewText: "Quanto custa não saber seu lucro real?",
    },
    free_active_limit_reached: {
      subject: (resource: string) =>
        `Você atingiu o limite de ${resource} no plano gratuito`,
      greeting: (name: string) => `Oi, ${name},`,
      body: (resource: string) =>
        `Para continuar usando <strong style="color:#d4d4d8;">${resource}</strong>, basta fazer upgrade para o Starter.`,
      subBody: "O Starter também desbloqueia:",
      features: [
        "Análise da nossa IA ilimitada",
        "14 gateways integrados (Stripe, Kiwify, Hotmart, Asaas, PayPal e mais)",
        "Comparativo entre períodos",
        "Suporte prioritário",
      ],
      cta: "Fazer upgrade →",
      previewText: (resource: string) =>
        `Você atingiu o limite de ${resource}`,
    },
    free_active_30d: {
      subject: "Primeiro mês do Starter por R$ 1",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "Você está usando o Groware há um mês — fico feliz que esteja aqui.",
      subBody:
        "Queria te oferecer uma coisa: experimente o plano Starter por R$ 1 no primeiro mês. Se não gostar, cancela antes do segundo mês sem nenhuma cobrança.",
      cta: "Ativar por R$ 1 →",
      previewText: "Primeiro mês do Starter por R$ 1",
    },
  },
  en: {
    free_active_14d: {
      subject: (count: number) => `You've used Groware ${count} times this month`,
      greeting: (name: string) => `Hi ${name},`,
      body: (count: number) =>
        `You've accessed Groware <strong style="color:#d4d4d8;">${count} times</strong> this month — great pace.`,
      subBody: "To keep growing with more depth, the Starter plan unlocks:",
      features: [
        "14 integrated gateways (Stripe, Kiwify, Hotmart, Asaas, PayPal and more)",
        "Unlimited AI analysis",
        "Period comparison",
        "Priority support",
      ],
      cta: "View plans →",
      previewText: (count: number) => `You've used Groware ${count} times this month`,
    },
    free_active_21d: {
      subject: "How much does not knowing your real profit cost?",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "Most entrepreneurs discover hidden costs when they set up the full P&L for the first time.",
      subBody:
        "With the Starter plan, Groware automatically calculates your real profit — revenue minus all your costs, no spreadsheet needed.",
      cta: "Try Starter →",
      previewText: "How much does not knowing your real profit cost?",
    },
    free_active_limit_reached: {
      subject: (resource: string) =>
        `You've reached the ${resource} limit on the free plan`,
      greeting: (name: string) => `Hi ${name},`,
      body: (resource: string) =>
        `To continue using <strong style="color:#d4d4d8;">${resource}</strong>, just upgrade to Starter.`,
      subBody: "Starter also unlocks:",
      features: [
        "Unlimited AI analysis",
        "14 integrated gateways (Stripe, Kiwify, Hotmart, Asaas, PayPal and more)",
        "Period comparison",
        "Priority support",
      ],
      cta: "Upgrade →",
      previewText: (resource: string) => `You've reached the ${resource} limit`,
    },
    free_active_30d: {
      subject: "First month of Starter for $1",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "You've been using Groware for a month — I'm really glad you're here.",
      subBody:
        "I wanted to offer you something: try the Starter plan for $1 in the first month. If you don't like it, cancel before the second month with no charge.",
      cta: "Activate for $1 →",
      previewText: "First month of Starter for $1",
    },
  },
} as const;

export function sequenceFreeActiveEmail(
  params: ISequenceFreeActiveEmailParams,
): string {
  const { emailId, userName, orgName, plansUrl, upgradeUrl, accessCount = 0, limitedResource = "", unsubscribeUrl } = params;
  const locale = params.locale ?? "pt";

  if (emailId === "free_active_14d") {
    const t = translations[locale].free_active_14d;
    const content = `
      <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:4px; line-height:1.5;">
        ${t.greeting(userName)}
      </p>
      <p style="color:#52525b; font-size:12px; margin-bottom:20px;">${orgName}</p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.body(accessCount)}
      </p>
      ${divider()}
      <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:16px;">
        ${t.subBody}
      </p>
      <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:8px;">
        ${t.features.map((feature) => `
        <tr>
          <td style="padding:0 0 8px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%; background:#09090b; border:1px solid #27272a; border-radius:8px; padding:12px 16px;">
              <tr>
                <td style="width:20px; color:#818cf8; font-size:14px;">→</td>
                <td style="padding-left:8px; color:#a1a1aa; font-size:13px;">${feature}</td>
              </tr>
            </table>
          </td>
        </tr>
        `).join("")}
      </table>
      ${ctaButton(t.cta, plansUrl)}
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText(accessCount));
  }

  if (emailId === "free_active_21d") {
    const t = translations[locale].free_active_21d;
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
      ${ctaButton(t.cta, upgradeUrl)}
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText);
  }

  if (emailId === "free_active_limit_reached") {
    const t = translations[locale].free_active_limit_reached;
    const content = `
      <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:4px; line-height:1.5;">
        ${t.greeting(userName)}
      </p>
      <p style="color:#52525b; font-size:12px; margin-bottom:20px;">${orgName}</p>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
        ${t.body(limitedResource)}
      </p>
      ${divider()}
      <p style="color:#71717a; font-size:13px; margin-bottom:12px;">${t.subBody}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:8px;">
        ${t.features.map((feature) => `
        <tr>
          <td style="padding:0 0 8px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%; background:#09090b; border:1px solid #27272a; border-radius:8px; padding:12px 16px;">
              <tr>
                <td style="width:20px; color:#818cf8; font-size:14px;">→</td>
                <td style="padding-left:8px; color:#a1a1aa; font-size:13px;">${feature}</td>
              </tr>
            </table>
          </td>
        </tr>
        `).join("")}
      </table>
      ${ctaButton(t.cta, upgradeUrl)}
      ${founderSignoff(locale)}
      ${unsubscribeFooter(unsubscribeUrl, locale)}
    `;
    return baseEmailLayout(content, locale, t.previewText(limitedResource));
  }

  const t = translations[locale].free_active_30d;
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
    ${ctaButton(t.cta, upgradeUrl)}
    ${founderSignoff(locale)}
    ${unsubscribeFooter(unsubscribeUrl, locale)}
  `;
  return baseEmailLayout(content, locale, t.previewText);
}

export function getFreeActiveSubject(
  emailId: FreeActiveEmailId,
  locale: Locale,
  accessCount = 0,
  limitedResource = "",
): string {
  const t = translations[locale];
  if (emailId === "free_active_14d") return t.free_active_14d.subject(accessCount);
  if (emailId === "free_active_21d") return t.free_active_21d.subject;
  if (emailId === "free_active_limit_reached") return t.free_active_limit_reached.subject(limitedResource);
  return t.free_active_30d.subject;
}
