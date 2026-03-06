import { LandingNav } from "@/app/_components/landing-nav";
import { LandingFooter } from "@/app/_components/landing-footer";

export const metadata = {
  title: "Changelog",
};

const releases = [
  {
    version: "v0.1.0-beta",
    date: "Mar 2026",
    tag: "beta",
    items: [
      "Dashboard com funil, KPIs e gráfico diário de receita",
      "Módulo de MRR com crescimento, movimentação e Sankey de assinantes",
      "Financeiro com breakdown por método de pagamento e categoria de produto",
      "Custos & P&L com waterfall e análise de IA",
      "Canais de aquisição com atribuição por UTM",
      "Landing Pages com métricas de funil por URL",
      "Tabela de eventos com debug e alertas de deduplicação",
      "Gestão de assinaturas ativas, em trial e canceladas",
      "Comparativo de períodos com análise por IA",
      "Integração nativa com Stripe (webhooks + sync de histórico completo)",
      "Análise com IA via Google Gemini 1.5 Flash com streaming",
      "tracker.js — script de rastreamento (2,1 kB, zero dependências)",
      "Página pública compartilhável por organização",
      "Multi-tenant com suporte a times e convites por e-mail",
      "Configurações regionais (moeda, fuso horário)",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50">
      <LandingNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{"// changelog"}</p>
        <h1
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-3"
          style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
        >
          O que mudou.
        </h1>
        <p className="text-zinc-400 text-lg leading-relaxed mb-16">
          Acompanhe todas as atualizações, melhorias e novidades do Groware.
        </p>

        <div className="flex flex-col gap-12">
          {releases.map(({ version, date, tag, items }) => (
            <div key={version} className="flex flex-col md:flex-row gap-8">
              <div className="md:w-44 flex-shrink-0">
                <span className="font-mono text-sm font-semibold text-zinc-300">{version}</span>
                <p className="text-xs text-zinc-600 font-mono mt-1">{date}</p>
                <span className="inline-block mt-2 text-xs font-mono px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  {tag}
                </span>
              </div>
              <div className="flex-1 bg-[#0f0f14] border border-white/[0.04] rounded-2xl p-6">
                <ul className="flex flex-col gap-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400 leading-relaxed">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
