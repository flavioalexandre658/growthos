import { baseEmailLayout, ctaButton, divider, type Locale } from "./base-layout";

export interface IWelcomeEmailParams {
  userName: string;
  dashboardUrl: string;
  locale?: Locale;
}

const translations = {
  pt: {
    badge: "BEM-VINDO AO GROWARE",
    greeting: (name: string) => `Olá, ${name}`,
    body: "Sua conta foi criada com sucesso. O Groware vai te ajudar a entender exatamente de onde vem seu crescimento, quais canais convertem melhor e onde você está perdendo receita.",
    stepsTitle: "PRÓXIMOS PASSOS",
    steps: [
      { n: "1", title: "Instale o tracker", desc: "Adicione o script no seu site para começar a capturar eventos automaticamente." },
      { n: "2", title: "Conecte o Stripe", desc: "Sincronize assinaturas e pagamentos para ter MRR, churn e ARPU em tempo real." },
      { n: "3", title: "Configure o funil", desc: "Defina os passos do seu funil para medir conversão de ponta a ponta." },
    ],
    cta: "Ir para o dashboard",
    footer: "Alguma dúvida? Responda este email — estamos aqui para ajudar.",
    previewText: (name: string) => `Bem-vindo ao Groware, ${name}`,
  },
  en: {
    badge: "WELCOME TO GROWARE",
    greeting: (name: string) => `Hello, ${name}`,
    body: "Your account has been created successfully. Groware will help you understand exactly where your growth comes from, which channels convert best, and where you're losing revenue.",
    stepsTitle: "NEXT STEPS",
    steps: [
      { n: "1", title: "Install the tracker", desc: "Add the script to your site to start capturing events automatically." },
      { n: "2", title: "Connect Stripe", desc: "Sync subscriptions and payments to get MRR, churn, and ARPU in real time." },
      { n: "3", title: "Set up your funnel", desc: "Define your funnel steps to measure end-to-end conversion." },
    ],
    cta: "Go to dashboard",
    footer: "Any questions? Reply to this email — we're here to help.",
    previewText: (name: string) => `Welcome to Groware, ${name}`,
  },
} as const;

export function welcomeEmail(params: IWelcomeEmailParams): string {
  const { userName, dashboardUrl } = params;
  const locale = params.locale ?? "pt";
  const t = translations[locale];

  const content = `
    <p style="color:#6366f1; font-size:12px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:20px;">
      ${t.badge}
    </p>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      ${t.greeting(userName)}
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      ${t.body}
    </p>

    ${divider()}

    <p style="color:#71717a; font-size:13px; font-weight:600; margin-bottom:16px; letter-spacing:0.3px;">
      ${t.stepsTitle}
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;">
      ${t.steps.map(step => `
      <tr>
        <td style="padding: 0 0 12px 0;">
          <table cellpadding="0" cellspacing="0" style="width:100%; background:#09090b; border:1px solid #27272a; border-radius:10px; padding:16px 20px;">
            <tr>
              <td style="width:32px; vertical-align:top; padding-top:2px;">
                <div style="
                  width:24px; height:24px;
                  background:#1e1b4b;
                  border:1px solid #312e81;
                  border-radius:6px;
                  text-align:center;
                  line-height:24px;
                  color:#818cf8;
                  font-size:12px;
                  font-weight:700;
                ">${step.n}</div>
              </td>
              <td style="padding-left:12px;">
                <p style="color:#e4e4e7; font-size:13px; font-weight:600; margin:0 0 4px;">${step.title}</p>
                <p style="color:#71717a; font-size:12px; margin:0; line-height:1.5;">${step.desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      `).join("")}
    </table>

    ${ctaButton(t.cta, dashboardUrl)}

    <p style="color:#52525b; font-size:12px; margin-top:24px; line-height:1.6; text-align:center;">
      ${t.footer}
    </p>
  `;

  return baseEmailLayout(
    content,
    locale,
    t.previewText(userName)
  );
}
