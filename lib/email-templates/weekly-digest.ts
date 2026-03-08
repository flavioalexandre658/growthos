import { baseEmailLayout, ctaButton, divider, founderSignoff, metricRow, unsubscribeFooter, type Locale } from "./base-layout";

export interface IWeeklyDigestEmailParams {
  orgName: string;
  userName: string;
  dashboardUrl: string;
  digestUnsubscribeUrl: string;
  mrr: string;
  mrrDelta: string;
  mrrDeltaPositive: boolean;
  weekRevenue: string;
  newSubscribers: number;
  churnRate: string;
  churnDelta?: string;
  churnDeltaPositive?: boolean;
  topChannel?: string;
  aiInsight?: string;
  locale?: Locale;
}

const translations = {
  pt: {
    subject: (orgName: string) => `Seu resumo semanal — ${orgName}`,
    greeting: (name: string) => `Oi, ${name},`,
    intro: (orgName: string) =>
      `Aqui está o que aconteceu no <strong style="color:#d4d4d8;">${orgName}</strong> nos últimos 7 dias.`,
    metricsTitle: "MÉTRICAS DA SEMANA",
    mrrLabel: "MRR atual",
    weekRevenueLabel: "Receita da semana",
    newSubscribersLabel: "Novos assinantes",
    churnLabel: "Churn rate",
    topChannelLabel: "Top canal de aquisição",
    insightTitle: "INSIGHT DA NOSSA IA",
    noInsight: "Dados insuficientes para gerar insight esta semana.",
    cta: "Ver dashboard completo →",
    digestOptOut: "Cancelar resumo semanal",
    previewText: (orgName: string) => `Seu resumo semanal — ${orgName}`,
    positive: "↑",
    negative: "↓",
  },
  en: {
    subject: (orgName: string) => `Your weekly digest — ${orgName}`,
    greeting: (name: string) => `Hi ${name},`,
    intro: (orgName: string) =>
      `Here's what happened at <strong style="color:#d4d4d8;">${orgName}</strong> over the last 7 days.`,
    metricsTitle: "WEEKLY METRICS",
    mrrLabel: "Current MRR",
    weekRevenueLabel: "Week revenue",
    newSubscribersLabel: "New subscribers",
    churnLabel: "Churn rate",
    topChannelLabel: "Top acquisition channel",
    insightTitle: "AI INSIGHT",
    noInsight: "Insufficient data to generate insight this week.",
    cta: "View full dashboard →",
    digestOptOut: "Unsubscribe from weekly digest",
    previewText: (orgName: string) => `Your weekly digest — ${orgName}`,
    positive: "↑",
    negative: "↓",
  },
} as const;

export function weeklyDigestEmail(params: IWeeklyDigestEmailParams): string {
  const {
    orgName,
    userName,
    dashboardUrl,
    digestUnsubscribeUrl,
    mrr,
    mrrDelta,
    mrrDeltaPositive,
    weekRevenue,
    newSubscribers,
    churnRate,
    churnDelta,
    churnDeltaPositive,
    topChannel,
    aiInsight,
  } = params;
  const locale = params.locale ?? "pt";
  const t = translations[locale];

  const mrrDeltaColor = mrrDeltaPositive ? "#86efac" : "#fca5a5";
  const mrrDeltaSymbol = mrrDeltaPositive ? t.positive : t.negative;

  const churnDeltaColor =
    churnDelta !== undefined
      ? churnDeltaPositive
        ? "#fca5a5"
        : "#86efac"
      : "#71717a";

  const content = `
    <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:20px; line-height:1.5;">
      ${t.greeting(userName)}
    </p>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${t.intro(orgName)}
    </p>

    ${divider()}

    <p style="color:#52525b; font-size:11px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:12px;">
      ${t.metricsTitle}
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:4px;">
      <tr>
        <td style="padding:0 0 4px 0;">
          <table cellpadding="0" cellspacing="0" style="width:100%; background:#09090b; border:1px solid #27272a; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:20px 20px 4px;">
                <p style="color:#71717a; font-size:11px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin:0 0 4px;">${t.mrrLabel}</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:baseline;">
                      <span style="color:#fafafa; font-size:28px; font-weight:800; letter-spacing:-0.5px;">${mrr}</span>
                    </td>
                    <td style="vertical-align:baseline; padding-left:8px;">
                      <span style="color:${mrrDeltaColor}; font-size:13px; font-weight:600;">${mrrDeltaSymbol} ${mrrDelta}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" style="width:100%;">
      ${metricRow(t.weekRevenueLabel, weekRevenue)}
      ${metricRow(t.newSubscribersLabel, String(newSubscribers))}
      ${metricRow(t.churnLabel, churnDelta !== undefined
        ? `${churnRate} <span style="color:${churnDeltaColor}; font-size:11px;">(${churnDeltaPositive ? "↑" : "↓"} ${churnDelta})</span>`
        : churnRate
      )}
      ${topChannel ? metricRow(t.topChannelLabel, `<span style="color:#818cf8; font-weight:600;">${topChannel}</span>`) : ""}
    </table>

    ${aiInsight ? `
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="background:linear-gradient(135deg,#1e1b4b,#1a1a2e); border:1px solid #312e81; border-radius:10px; padding:20px;">
          <p style="color:#818cf8; font-size:11px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin:0 0 10px;">
            ${t.insightTitle}
          </p>
          <p style="color:#c7d2fe; font-size:13px; line-height:1.7; margin:0;">
            ${aiInsight}
          </p>
        </td>
      </tr>
    </table>
    ` : ""}

    ${ctaButton(t.cta, dashboardUrl)}

    ${founderSignoff(locale)}

    <p style="text-align:center; margin-top:16px;">
      <a href="${digestUnsubscribeUrl}" style="color:#3f3f46; font-size:11px; text-decoration:underline;">
        ${t.digestOptOut}
      </a>
    </p>

    ${unsubscribeFooter(digestUnsubscribeUrl + "&all=1", locale)}
  `;

  return baseEmailLayout(content, locale, t.previewText(orgName));
}

export function getWeeklyDigestSubject(orgName: string, locale: Locale): string {
  return translations[locale].subject(orgName);
}
