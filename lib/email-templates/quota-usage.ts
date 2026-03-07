import { baseEmailLayout, ctaButton, divider } from "./base-layout";

export interface IQuotaUsageEmailParams {
  userName: string;
  planName: string;
  revenueTotal: number;
  revenueLimit: number;
  percentage: number;
  orgBreakdown: { name: string; revenueInCents: number }[];
  upgradeUrl: string;
  dashboardUrl: string;
  isExceeded: boolean;
}

function formatRevenue(cents: number): string {
  const val = cents / 100;
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(1)}k`;
  return `R$ ${val.toFixed(0)}`;
}

function usageBar(percentage: number, isExceeded: boolean): string {
  const filled = Math.min(100, percentage);
  const empty = 100 - filled;
  const filledColor = isExceeded ? "#ef4444" : "#f59e0b";
  const filledWidth = Math.round(filled * 3.2);
  const emptyWidth = Math.round(empty * 3.2);

  return `<table cellpadding="0" cellspacing="0" style="width:100%; margin:12px 0 8px;">
    <tr>
      <td style="height:6px; border-radius:3px; overflow:hidden; background:#27272a;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            ${filledWidth > 0 ? `<td width="${filledWidth}" style="height:6px; background:${filledColor}; border-radius:3px 0 0 3px;"></td>` : ""}
            ${emptyWidth > 0 ? `<td width="${emptyWidth}" style="height:6px; background:#27272a;"></td>` : ""}
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export function quotaUsageEmail(params: IQuotaUsageEmailParams): string {
  const {
    userName,
    planName,
    revenueTotal,
    revenueLimit,
    percentage,
    orgBreakdown,
    upgradeUrl,
    isExceeded,
  } = params;

  const badgeColor = isExceeded ? "#1a0000" : "#2d1f00";
  const badgeBorder = isExceeded ? "#450a0a" : "#451a03";
  const badgeText = isExceeded ? "#fca5a5" : "#fcd34d";
  const badgeLabel = isExceeded ? "LIMITE ATINGIDO" : "AVISO DE RECEITA";
  const accentColor = isExceeded ? "#ef4444" : "#f59e0b";
  const title = isExceeded
    ? "Limite de receita atingido"
    : "Você está perto do limite de receita";
  const description = isExceeded
    ? `Sua conta atingiu <strong style="color:#fca5a5;">100%</strong> do limite de receita do plano <strong style="color:#d4d4d8;">${planName}</strong>. Faça upgrade para continuar acompanhando seus dados sem restrições.`
    : `Sua conta atingiu <strong style="color:#fcd34d;">${percentage}%</strong> do limite de receita do plano <strong style="color:#d4d4d8;">${planName}</strong>. Considere fazer upgrade antes de atingir o limite.`;

  const orgRows = orgBreakdown
    .sort((a, b) => b.revenueInCents - a.revenueInCents)
    .map((org, i) => {
      const isLast = i === orgBreakdown.length - 1;
      const prefix = isLast ? "└" : "├";
      return `<tr>
        <td style="padding:6px 0; border-bottom:${isLast ? "none" : "1px solid #27272a"};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#52525b; font-size:12px; width:16px;">${prefix}</td>
              <td style="color:#a1a1aa; font-size:13px;">${org.name}</td>
              <td style="text-align:right; color:#d4d4d8; font-size:13px; font-weight:600;">${formatRevenue(org.revenueInCents)}</td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  const content = `
    <div style="
      display:inline-block;
      background:${badgeColor};
      border:1px solid ${badgeBorder};
      border-radius:8px;
      padding:4px 12px;
      margin-bottom:20px;
    ">
      <span style="color:${badgeText}; font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase;">
        ${badgeLabel}
      </span>
    </div>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      ${title}
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      Olá, <strong style="color:#d4d4d8;">${userName}</strong>. ${description}
    </p>

    ${divider()}

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:24px;">
      <tr>
        <td style="
          background:#09090b;
          border:1px solid #27272a;
          border-radius:10px;
          padding:20px;
        ">
          <p style="color:#52525b; font-size:12px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:16px;">
            RECEITA ESTE MÊS
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#a1a1aa; font-size:13px;">
                      <strong style="color:#fafafa; font-size:20px; font-weight:700;">${formatRevenue(revenueTotal)}</strong>
                      <span style="color:#52525b; font-size:13px;"> / ${formatRevenue(revenueLimit)}</span>
                    </td>
                    <td style="text-align:right; color:${accentColor}; font-size:16px; font-weight:700;">${percentage}%</td>
                  </tr>
                </table>

                ${usageBar(percentage, isExceeded)}

              </td>
            </tr>
          </table>

          ${orgBreakdown.length > 0 ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px; border-top:1px solid #27272a; padding-top:12px;">
            ${orgRows}
          </table>
          ` : ""}
        </td>
      </tr>
    </table>

    ${ctaButton(isExceeded ? "Fazer upgrade agora" : "Ver planos disponíveis", upgradeUrl)}

    <p style="color:#52525b; font-size:12px; margin-top:20px; line-height:1.6; text-align:center;">
      Você pode gerenciar seu plano a qualquer momento nas
      <a href="${upgradeUrl}" style="color:#6366f1; text-decoration:none;">configurações de cobrança</a>.
    </p>
  `;

  const previewText = isExceeded
    ? `Limite de receita atingido: ${formatRevenue(revenueTotal)} / ${formatRevenue(revenueLimit)} este mês`
    : `Aviso: você usou ${percentage}% do limite mensal de receita`;

  return baseEmailLayout(content, previewText);
}
