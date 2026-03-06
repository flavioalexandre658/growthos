export function baseEmailLayout(content: string, previewText?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  ${previewText ? `<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</span>` : ""}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #09090b; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    a { color: #6366f1; text-decoration: none; }
    a:hover { color: #818cf8; }
  </style>
</head>
<body style="background-color:#09090b; padding: 40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto;">
    <tr>
      <td>
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding: 0 0 20px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="
                    background: linear-gradient(135deg, #6366f1, #4f46e5);
                    border-radius: 10px;
                    width: 36px;
                    height: 36px;
                    text-align: center;
                    vertical-align: middle;
                    display: inline-block;
                  ">
                    <span style="color:#fff; font-size:18px; font-weight:700; line-height:36px; display:block;">G</span>
                  </td>
                  <td style="padding-left:10px; vertical-align:middle;">
                    <span style="color:#fafafa; font-size:16px; font-weight:700; letter-spacing:-0.3px;">Groware</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 16px;
          overflow: hidden;
        ">
          <tr>
            <td style="padding: 40px 40px 32px;">
              ${content}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
          <tr>
            <td style="text-align:center;">
              <p style="color:#52525b; font-size:12px; line-height:1.6;">
                Groware · Plataforma de Growth Analytics
              </p>
              <p style="color:#3f3f46; font-size:11px; margin-top:4px;">
                Você está recebendo este email porque possui uma conta no Groware.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function badge(text: string, color: "indigo" | "green" | "amber" | "red" | "zinc"): string {
  const colors = {
    indigo: { bg: "#1e1b4b", text: "#a5b4fc", border: "#312e81" },
    green: { bg: "#052e16", text: "#86efac", border: "#14532d" },
    amber: { bg: "#2d1f00", text: "#fcd34d", border: "#451a03" },
    red: { bg: "#1a0000", text: "#fca5a5", border: "#450a0a" },
    zinc: { bg: "#27272a", text: "#a1a1aa", border: "#3f3f46" },
  };
  const c = colors[color];
  return `<span style="
    display:inline-block;
    background:${c.bg};
    color:${c.text};
    border:1px solid ${c.border};
    border-radius:6px;
    padding:3px 10px;
    font-size:11px;
    font-weight:600;
    letter-spacing:0.3px;
  ">${text}</span>`;
}

export function ctaButton(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        border-radius: 10px;
        padding: 1px;
      ">
        <a href="${href}" style="
          display: block;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-radius: 9px;
          padding: 13px 28px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.1px;
          text-decoration: none;
          text-align: center;
        ">${text}</a>
      </td>
    </tr>
  </table>`;
}

export function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="border-top:1px solid #27272a; height:1px;"></td>
    </tr>
  </table>`;
}

export function metricRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0; border-bottom:1px solid #27272a;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:#71717a; font-size:13px;">${label}</td>
          <td style="text-align:right; color:#fafafa; font-size:13px; font-weight:600;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}
