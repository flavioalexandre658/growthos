import { LandingNav } from "@/app/_components/landing-nav";
import { LandingFooter } from "@/app/_components/landing-footer";

export const metadata = {
  title: "Política de Privacidade",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-200 tracking-tight mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50">
      <LandingNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">// legal</p>
        <h1
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-3"
          style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
        >
          Política de Privacidade
        </h1>
        <p className="text-zinc-500 font-mono text-sm mb-12">Última atualização: Março de 2026</p>

        <div className="flex flex-col gap-10 text-zinc-400 leading-relaxed">
          <Section title="1. Informações que coletamos">
            <p>
              O Groware coleta informações necessárias para fornecer o serviço de analytics. Isso inclui dados de
              eventos enviados pelo seu script (tracker.js), dados de pagamento sincronizados via integrações com
              gateways, e informações da sua conta (nome, e-mail, organização).
            </p>
            <p className="mt-3">
              Os dados de eventos são processados de forma anonimizada por padrão. Recomendamos utilizar a função
              hashAnonymous() para anonimizar identificadores de clientes antes de enviá-los ao Groware.
            </p>
          </Section>

          <Section title="2. Como usamos seus dados">
            <p>Utilizamos seus dados exclusivamente para:</p>
            <ul className="mt-2 flex flex-col gap-1.5 ml-4">
              {[
                "Fornecer os dashboards e análises contratados",
                "Processar e exibir métricas de receita, funil e canais",
                "Gerar análises de IA com base no contexto da sua organização",
                "Enviar notificações sobre alertas e relatórios configurados",
                "Melhorar a qualidade e confiabilidade do serviço",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="3. Compartilhamento de dados">
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. Os
              dados podem ser compartilhados com prestadores de serviço essenciais para a operação da plataforma,
              como provedores de infraestrutura em nuvem, sempre sujeitos a acordos de confidencialidade.
            </p>
          </Section>

          <Section title="4. Segurança">
            <p>
              Utilizamos criptografia em trânsito (TLS) e em repouso para proteger seus dados. O acesso às chaves
              de API e integrações é feito com o mínimo de permissões necessárias (somente leitura no caso do
              Stripe). Recomendamos que você mantenha suas chaves de API em segurança e não as compartilhe
              publicamente.
            </p>
          </Section>

          <Section title="5. Retenção de dados">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar o encerramento da conta, seus
              dados serão excluídos em até 30 dias, exceto quando houver obrigação legal de retenção.
            </p>
          </Section>

          <Section title="6. Seus direitos (LGPD)">
            <p>
              De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 ml-4">
              {[
                "Confirmação da existência de tratamento dos seus dados",
                "Acesso aos seus dados pessoais",
                "Correção de dados incompletos, inexatos ou desatualizados",
                "Portabilidade dos dados a outro fornecedor",
                "Eliminação dos dados pessoais tratados com seu consentimento",
                "Revogação do consentimento a qualquer momento",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="7. Cookies">
            <p>
              Utilizamos cookies essenciais para autenticação e manutenção de sessão. Não utilizamos cookies de
              rastreamento de terceiros para fins publicitários.
            </p>
          </Section>

          <Section title="8. Contato">
            <p>
              Para exercer seus direitos, dúvidas sobre privacidade ou solicitações de exclusão de dados, entre
              em contato pelo e-mail{" "}
              <a
                href="mailto:privacidade@groware.io"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                privacidade@groware.io
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
