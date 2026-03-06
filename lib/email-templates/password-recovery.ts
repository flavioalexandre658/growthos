import { baseEmailLayout, ctaButton, divider } from "./base-layout";

export interface IPasswordRecoveryEmailParams {
  userName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function passwordRecoveryEmail(params: IPasswordRecoveryEmailParams): string {
  const { userName, resetUrl, expiresInMinutes = 60 } = params;

  const content = `
    <p style="color:#6366f1; font-size:12px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:20px;">
      RECUPERAÇÃO DE SENHA
    </p>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      Redefinir sua senha
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      Olá, <strong style="color:#d4d4d8;">${userName}</strong>. Recebemos uma solicitação para redefinir
      a senha da sua conta no Groware. Clique no botão abaixo para criar uma nova senha.
    </p>

    ${ctaButton("Redefinir senha", resetUrl)}

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
            AVISO DE SEGURANÇA
          </p>
          <p style="color:#71717a; font-size:13px; line-height:1.6; margin:0;">
            Este link expira em <strong style="color:#a1a1aa;">${expiresInMinutes} minutos</strong>.
            Se você não solicitou a redefinição de senha, ignore este email — sua conta está segura.
            Nunca compartilhe este link com ninguém.
          </p>
        </td>
      </tr>
    </table>

    <p style="color:#52525b; font-size:12px; margin-top:20px; line-height:1.6;">
      Ou copie e cole este link no seu navegador:<br/>
      <span style="color:#6366f1; word-break:break-all;">${resetUrl}</span>
    </p>
  `;

  return baseEmailLayout(
    content,
    "Redefinição de senha solicitada para sua conta Groware"
  );
}
