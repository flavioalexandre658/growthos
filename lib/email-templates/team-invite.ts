import { baseEmailLayout, ctaButton, divider, type Locale } from "./base-layout";

export interface ITeamInviteEmailParams {
  inviteeEmail: string;
  orgName: string;
  inviterName: string;
  role: "admin" | "viewer";
  inviteUrl: string;
  expiresInDays?: number;
  locale?: Locale;
}

const translations = {
  pt: {
    roleLabels: { admin: "Admin", viewer: "Visualizador" } as Record<string, string>,
    badge: "CONVITE DE EQUIPE",
    heading: (orgName: string) => `Você foi convidado para o ${orgName}`,
    body: (inviterName: string, orgName: string, roleLabel: string) =>
      `<strong style="color:#d4d4d8;">${inviterName}</strong> convidou você para participar do workspace <strong style="color:#d4d4d8;">${orgName}</strong> no Groware como <strong style="color:#d4d4d8;">${roleLabel}</strong>.`,
    cta: "Aceitar convite",
    aboutTitle: "SOBRE O CONVITE",
    aboutBody: (days: number) =>
      `Este convite expira em <strong style="color:#a1a1aa;">${days} dias</strong>. Se você não esperava receber este convite, pode ignorar este email com segurança.`,
    copyLink: "Ou copie e cole este link no seu navegador:",
    previewText: (inviterName: string, orgName: string) =>
      `${inviterName} convidou você para o ${orgName} no Groware`,
  },
  en: {
    roleLabels: { admin: "Admin", viewer: "Viewer" } as Record<string, string>,
    badge: "TEAM INVITE",
    heading: (orgName: string) => `You've been invited to ${orgName}`,
    body: (inviterName: string, orgName: string, roleLabel: string) =>
      `<strong style="color:#d4d4d8;">${inviterName}</strong> invited you to join the <strong style="color:#d4d4d8;">${orgName}</strong> workspace on Groware as <strong style="color:#d4d4d8;">${roleLabel}</strong>.`,
    cta: "Accept invite",
    aboutTitle: "ABOUT THE INVITE",
    aboutBody: (days: number) =>
      `This invite expires in <strong style="color:#a1a1aa;">${days} days</strong>. If you weren't expecting this invite, you can safely ignore this email.`,
    copyLink: "Or copy and paste this link in your browser:",
    previewText: (inviterName: string, orgName: string) =>
      `${inviterName} invited you to ${orgName} on Groware`,
  },
} as const;

export function teamInviteEmail(params: ITeamInviteEmailParams): string {
  const {
    orgName,
    inviterName,
    role,
    inviteUrl,
    expiresInDays = 7,
  } = params;
  const locale = params.locale ?? "pt";
  const t = translations[locale];
  const roleLabel = t.roleLabels[role];

  const content = `
    <p style="color:#6366f1; font-size:12px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:20px;">
      ${t.badge}
    </p>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      ${t.heading(orgName)}
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      ${t.body(inviterName, orgName, roleLabel)}
    </p>

    ${ctaButton(t.cta, inviteUrl)}

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
            ${t.aboutTitle}
          </p>
          <p style="color:#71717a; font-size:13px; line-height:1.6; margin:0;">
            ${t.aboutBody(expiresInDays)}
          </p>
        </td>
      </tr>
    </table>

    <p style="color:#52525b; font-size:12px; margin-top:20px; line-height:1.6;">
      ${t.copyLink}<br/>
      <span style="color:#6366f1; word-break:break-all;">${inviteUrl}</span>
    </p>
  `;

  return baseEmailLayout(
    content,
    locale,
    t.previewText(inviterName, orgName)
  );
}
