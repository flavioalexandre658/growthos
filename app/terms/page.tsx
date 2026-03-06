import { LandingNav } from "@/app/_components/landing-nav";
import { LandingFooter } from "@/app/_components/landing-footer";

export const metadata = {
  title: "Termos de Uso",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-200 tracking-tight mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50">
      <LandingNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">// legal</p>
        <h1
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-3"
          style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
        >
          Termos de Uso
        </h1>
        <p className="text-zinc-500 font-mono text-sm mb-12">Última atualização: Março de 2026</p>

        <div className="flex flex-col gap-10 text-zinc-400 leading-relaxed">
          <Section title="1. Aceitação dos termos">
            <p>
              Ao acessar ou utilizar o Groware, você concorda com estes Termos de Uso e com nossa Política de
              Privacidade. Se você não concordar com qualquer parte destes termos, não poderá utilizar o serviço.
            </p>
          </Section>

          <Section title="2. Descrição do serviço">
            <p>
              O Groware é uma plataforma de analytics de crescimento e receita para empresas SaaS e negócios
              digitais. O serviço inclui dashboards de MRR, análise de canais de aquisição, P&L, rastreamento de
              eventos e análise com inteligência artificial.
            </p>
          </Section>

          <Section title="3. Período de beta">
            <p>
              O Groware está atualmente em fase de acesso antecipado (beta). Durante este período, o serviço é
              oferecido gratuitamente. Nos reservamos o direito de alterar os planos e preços com aviso prévio
              razoável aos usuários antes do lançamento oficial.
            </p>
          </Section>

          <Section title="4. Uso aceitável">
            <p>Você concorda em não utilizar o Groware para:</p>
            <ul className="mt-2 flex flex-col gap-1.5 ml-4">
              {[
                "Violar qualquer lei ou regulamentação aplicável",
                "Transmitir dados pessoais sensíveis sem o devido consentimento do titular",
                "Tentar obter acesso não autorizado a sistemas ou dados de outros usuários",
                "Realizar engenharia reversa ou copiar o serviço",
                "Enviar dados de clientes não anonimizados que possam identificar pessoas físicas",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="5. Suas responsabilidades">
            <p>
              Você é responsável por manter a segurança das suas credenciais de acesso e chaves de API. O Groware
              não se responsabiliza por danos decorrentes do uso não autorizado da sua conta por terceiros.
            </p>
            <p className="mt-3">
              Você também é responsável por garantir que os dados enviados ao Groware estejam em conformidade com
              a LGPD e demais legislações de proteção de dados aplicáveis ao seu negócio.
            </p>
          </Section>

          <Section title="6. Propriedade intelectual">
            <p>
              O Groware e todo o seu conteúdo — incluindo interface, código, marca e documentação — são de
              propriedade exclusiva da Groware e protegidos por leis de propriedade intelectual. Estes termos não
              concedem a você nenhuma licença sobre a propriedade intelectual da Groware, exceto o direito
              limitado de uso do serviço.
            </p>
          </Section>

          <Section title="7. Limitação de responsabilidade">
            <p>
              O serviço é fornecido "como está" durante o período de beta. O Groware não garante disponibilidade
              ininterrupta ou ausência de erros. Em nenhuma circunstância a Groware será responsável por danos
              indiretos, incidentais ou consequentes decorrentes do uso ou impossibilidade de uso do serviço.
            </p>
          </Section>

          <Section title="8. Alterações nos termos">
            <p>
              Podemos atualizar estes Termos de Uso periodicamente. Notificaremos os usuários sobre mudanças
              significativas por e-mail ou por aviso na plataforma. O uso continuado do serviço após as
              alterações constitui aceitação dos novos termos.
            </p>
          </Section>

          <Section title="9. Contato">
            <p>
              Para dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail{" "}
              <a
                href="mailto:legal@groware.io"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                legal@groware.io
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
