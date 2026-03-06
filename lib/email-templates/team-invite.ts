import { baseEmailLayout, ctaButton, divider } from "./base-layout";

export interface ITeamInviteEmailParams {
  inviteeEmail: string;
  orgName: string;
  inviterName: string;
  role: "admin" | "viewer";
  inviteUrl: string;
  expiresInDays?: number;
}

const ROLE_LABELS = {
  admin: "Admin",
  viewer: "Visualizador",
};

export function teamInviteEmail(params: ITeamInviteEmailParams): string {
  const {
    orgName,
    inviterName,
    role,
    inviteUrl,
    expiresInDays = 7,
  } = params;

  const content = `
    <p style="color:#6366f1; font-size:12px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:20px;">
      CONVITE DE EQUIPE
    </p>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      Você foi convidado para o ${orgName}
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      <strong style="color:#d4d4d8;">${inviterName}</strong> convidou você para participar do workspace
      <strong style="color:#d4d4d8;">${orgName}</strong> no Groware como
      <strong style="color:#d4d4d8;">${ROLE_LABELS[role]}</strong>.
    </p>

    ${ctaButton("Aceitar convite", inviteUrl)}

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
            SOBRE O CONVITE
          </p>
          <p style="color:#71717a; font-size:13px; line-height:1.6; margin:0;">
            Este convite expira em <strong style="color:#a1a1aa;">${expiresInDays} dias</strong>.
            Se você não esperava receber este convite, pode ignorar este email com segurança.
          </p>
        </td>
      </tr>
    </table>

    <p style="color:#52525b; font-size:12px; margin-top:20px; line-height:1.6;">
      Ou copie e cole este link no seu navegador:<br/>
      <span style="color:#6366f1; word-break:break-all;">${inviteUrl}</span>
    </p>
  `;

  return baseEmailLayout(
    content,
    `${inviterName} convidou você para o ${orgName} no Groware`
  );
}
