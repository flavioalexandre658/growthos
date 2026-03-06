import { baseEmailLayout, ctaButton, divider } from "./base-layout";

export interface IWelcomeEmailParams {
  userName: string;
  dashboardUrl: string;
}

export function welcomeEmail(params: IWelcomeEmailParams): string {
  const { userName, dashboardUrl } = params;

  const content = `
    <p style="color:#6366f1; font-size:12px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:20px;">
      BEM-VINDO AO GROWARE
    </p>

    <h1 style="color:#fafafa; font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:12px; line-height:1.3;">
      Olá, ${userName}
    </h1>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.7; margin-bottom:0;">
      Sua conta foi criada com sucesso. O Groware vai te ajudar a entender exatamente
      de onde vem seu crescimento, quais canais convertem melhor e onde você está perdendo receita.
    </p>

    ${divider()}

    <p style="color:#71717a; font-size:13px; font-weight:600; margin-bottom:16px; letter-spacing:0.3px;">
      PRÓXIMOS PASSOS
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;">
      ${[
        { n: "1", title: "Instale o tracker", desc: "Adicione o script no seu site para começar a capturar eventos automaticamente." },
        { n: "2", title: "Conecte o Stripe", desc: "Sincronize assinaturas e pagamentos para ter MRR, churn e ARPU em tempo real." },
        { n: "3", title: "Configure o funil", desc: "Defina os passos do seu funil para medir conversão de ponta a ponta." },
      ].map(step => `
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

    ${ctaButton("Ir para o dashboard", dashboardUrl)}

    <p style="color:#52525b; font-size:12px; margin-top:24px; line-height:1.6; text-align:center;">
      Alguma dúvida? Responda este email — estamos aqui para ajudar.
    </p>
  `;

  return baseEmailLayout(
    content,
    `Bem-vindo ao Groware, ${userName}`
  );
}
