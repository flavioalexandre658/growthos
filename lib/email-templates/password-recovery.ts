import { baseEmailLayout, ctaButton, divider, type Locale } from "./base-layout";

export interface IPasswordRecoveryEmailParams {
  userName: string;
  resetUrl: string;
  expiresInMinutes?: number;
  locale?: Locale;
}

const translations = {
  pt: {
    badge: "RECUPERAÇÃO DE SENHA",
    heading: "Redefinir sua senha",
    body: (name: string) =>
      `Olá, <strong style="color:#d4d4d8;">${name}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta no Groware. Clique no botão abaixo para criar uma nova senha.`,
    cta: "Redefinir senha",
    securityTitle: "AVISO DE SEGURANÇA",
    securityBody: (minutes: number) =>
      `Este link expira em <strong style="color:#a1a1aa;">${minutes} minutos</strong>. Se você não solicitou a redefinição de senha, ignore este email — sua conta está segura. Nunca compartilhe este link com ninguém.`,
    copyLink: "Ou copie e cole este link no seu navegador:",
    previewText: "Redefinição de senha solicitada para sua conta Groware",
  },
  en: {
    badge: "PASSWORD RECOVERY",
    heading: "Reset your password",
    body: (name: string) =>
      `Hello, <strong style="color:#d4d4d8;">${name}</strong>. We received a request to reset your Groware account password. Click the button below to create a new password.`,
    cta: "Reset password",
    securityTitle: "SECURITY NOTICE",
    securityBody: (minutes: number) =>
      `This link expires in <strong style="color:#a1a1aa;">${minutes} minutes</strong>. If you didn't request a password reset, ignore this email — your account is safe. Never share this link with anyone.`,
    copyLink: "Or copy and paste this link in your browser:",
    previewText: "Password reset requested for your Groware account",
  },
} as const;

export function passwordRecoveryEmail(params: IPasswordRecoveryEmailParams): string {
  const { userName, resetUrl, expiresInMinutes = 60 } = params;
  const locale = params.locale ?? "pt";
  const t = translations[locale];

  const content = `
    <p style="color:#6366f1; font-size:12px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:20px;">
      ${t.badge}
    </p>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      ${t.heading}
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      ${t.body(userName)}
    </p>

    ${ctaButton(t.cta, resetUrl)}

    ${divider()}

    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="
          background:#09090b;
          border:1px solid #27272a;
          border-radius:10px;
          padding:16px 20px;
        ">
          <p style="color:#52525b; font-size:12px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;">
            ${t.securityTitle}
          </p>
          <p style="color:#71717a; font-size:13px; line-height:1.6; margin:0;">
            ${t.securityBody(expiresInMinutes)}
          </p>
        </td>
      </tr>
    </table>

    <p style="color:#52525b; font-size:12px; margin-top:20px; line-height:1.6;">
      ${t.copyLink}<br/>
      <span style="color:#6366f1; word-break:break-all;">${resetUrl}</span>
    </p>
  `;

  return baseEmailLayout(
    content,
    locale,
    t.previewText
  );
}
