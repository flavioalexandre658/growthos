import { baseEmailLayout, ctaButton, divider } from "./base-layout";

export type AlertType = "no_events" | "churn_rate" | "revenue_drop";

export interface IAlertNotificationEmailParams {
  orgName: string;
  alertType: AlertType;
  threshold: number;
  currentValue?: number;
  dashboardUrl: string;
}

const ALERT_CONFIG: Record<AlertType, { label: string; description: (threshold: number, current?: number) => string; color: string }> = {
  no_events: {
    label: "Sem eventos detectados",
    description: (threshold) =>
      `Nenhum evento foi recebido nos últimos <strong style="color:#fca5a5;">${threshold} minutos</strong>. Verifique se o tracker está funcionando corretamente.`,
    color: "#ef4444",
  },
  churn_rate: {
    label: "Taxa de churn elevada",
    description: (threshold, current) =>
      `Sua taxa de churn atingiu <strong style="color:#fca5a5;">${current?.toFixed(1) ?? "?"}%</strong>, acima do limite configurado de <strong style="color:#fca5a5;">${threshold}%</strong>.`,
    color: "#f97316",
  },
  revenue_drop: {
    label: "Queda de receita detectada",
    description: (threshold, current) =>
      `Sua receita caiu <strong style="color:#fca5a5;">${current?.toFixed(1) ?? "?"}%</strong>, acima do limite de queda configurado de <strong style="color:#fca5a5;">${threshold}%</strong>.`,
    color: "#ef4444",
  },
};

export function alertNotificationEmail(params: IAlertNotificationEmailParams): string {
  const { orgName, alertType, threshold, currentValue, dashboardUrl } = params;
  const config = ALERT_CONFIG[alertType];

  const content = `
    <div style="
      display:inline-block;
      background:#1a0000;
      border:1px solid #450a0a;
      border-radius:8px;
      padding:4px 12px;
      margin-bottom:20px;
    ">
      <span style="color:#fca5a5; font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase;">
        ALERTA ATIVO
      </span>
    </div>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      ${config.label}
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      ${config.description(threshold, currentValue)}
      Isso afeta o workspace <strong style="color:#d4d4d8;">${orgName}</strong>.
    </p>

    ${divider()}

    <table cellpadding="0" cellspacing="0" style="width:100%; margin-bottom:24px;">
      <tr>
        <td style="
          background:#09090b;
          border:1px solid #27272a;
          border-radius:10px;
          padding:16px 20px;
        ">
          <p style="color:#52525b; font-size:12px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:12px;">
            DETALHES DO ALERTA
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0; border-bottom:1px solid #27272a;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#71717a; font-size:13px;">Tipo</td>
                    <td style="text-align:right; color:#fafafa; font-size:13px; font-weight:600;">${config.label}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0; border-bottom:1px solid #27272a;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#71717a; font-size:13px;">Limite configurado</td>
                    <td style="text-align:right; color:#fafafa; font-size:13px; font-weight:600;">${threshold}${alertType === "no_events" ? " min" : "%"}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${currentValue !== undefined ? `
            <tr>
              <td style="padding:6px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#71717a; font-size:13px;">Valor atual</td>
                    <td style="text-align:right; color:#fca5a5; font-size:13px; font-weight:600;">${currentValue.toFixed(1)}${alertType === "no_events" ? " min" : "%"}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ` : ""}
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton("Verificar no dashboard", dashboardUrl)}
  `;

  return baseEmailLayout(
    content,
    `Alerta Groware: ${config.label} — ${orgName}`
  );
}
