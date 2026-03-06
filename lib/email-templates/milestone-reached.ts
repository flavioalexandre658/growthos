import { baseEmailLayout, ctaButton, divider } from "./base-layout";

export interface IMilestoneReachedEmailParams {
  orgName: string;
  milestoneLabel: string;
  milestoneEmoji: string;
  metricLabel: string;
  metricValue: string;
  shareUrl?: string;
  dashboardUrl: string;
}

export function milestoneReachedEmail(params: IMilestoneReachedEmailParams): string {
  const {
    orgName,
    milestoneLabel,
    milestoneEmoji,
    metricLabel,
    metricValue,
    shareUrl,
    dashboardUrl,
  } = params;

  const content = `
    <p style="color:#6366f1; font-size:12px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:20px;">
      MARCO ATINGIDO
    </p>

    <div style="text-align:center; padding: 8px 0 24px;">
      <div style="
        display:inline-block;
        font-size:56px;
        line-height:1;
        margin-bottom:20px;
      ">${milestoneEmoji}</div>

      <h1 style="color:#fafafa; font-size:28px; font-weight:800; letter-spacing:-0.8px; margin-bottom:12px; line-height:1.2;">
        ${milestoneLabel}
      </h1>

      <p style="color:#a1a1aa; font-size:14px; line-height:1.7; max-width:360px; margin:0 auto;">
        <strong style="color:#d4d4d8;">${orgName}</strong> acaba de atingir um novo marco.
        Este é um momento incrível — você está construindo algo real.
      </p>
    </div>

    ${divider()}

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:28px;">
      <tr>
        <td style="
          background: linear-gradient(135deg, #1e1b4b, #1a1a2e);
          border: 1px solid #312e81;
          border-radius:12px;
          padding:24px;
          text-align:center;
        ">
          <p style="color:#818cf8; font-size:12px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;">
            ${metricLabel}
          </p>
          <p style="color:#fafafa; font-size:40px; font-weight:800; letter-spacing:-1px; margin:0; line-height:1;">
            ${metricValue}
          </p>
        </td>
      </tr>
    </table>

    ${shareUrl ? `
    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:16px;">
      <tr>
        <td style="
          background:#09090b;
          border:1px solid #27272a;
          border-radius:10px;
          padding:16px 20px;
        ">
          <p style="color:#52525b; font-size:12px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;">
            COMPARTILHE COM SUA AUDIÊNCIA
          </p>
          <p style="color:#71717a; font-size:13px; line-height:1.6; margin:0 0 12px;">
            Mostre seu progresso publicamente. Sua página pública está disponível para compartilhar.
          </p>
          <a href="${shareUrl}" style="
            display:inline-block;
            background:#1e1b4b;
            border:1px solid #312e81;
            border-radius:8px;
            padding:8px 16px;
            color:#818cf8;
            font-size:12px;
            font-weight:600;
            text-decoration:none;
          ">Ver página pública →</a>
        </td>
      </tr>
    </table>
    ` : ""}

    ${ctaButton("Ver métricas no dashboard", dashboardUrl)}
  `;

  return baseEmailLayout(
    content,
    `${orgName} atingiu: ${milestoneLabel}`
  );
}
