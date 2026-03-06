import {
  IconLayoutDashboard,
  IconRepeat,
  IconCoin,
  IconTrendingDown,
  IconChartLine,
  IconFileText,
  IconBolt,
  IconCreditCard,
  IconChartBar,
  IconSearch,
  IconSparkles,
  IconEye,
  IconUsers,
  IconCurrencyDollar,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";
import { LandingNav } from "./landing-nav";
import { LandingCtaForm } from "./landing-cta-form";
import { LandingFooter } from "./landing-footer";

function StripeLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#635BFF">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  );
}

function AsaasLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <rect width="24" height="24" rx="6" fill="#0066CC" />
      <text x="12" y="17" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="13" fill="white">A</text>
    </svg>
  );
}

function KiwifyLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <rect width="24" height="24" rx="6" fill="#7C3AED" />
      <text x="12" y="17" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="13" fill="white">K</text>
    </svg>
  );
}

function HotmartLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <rect width="24" height="24" rx="6" fill="#FF5000" />
      <path d="M12 4c0 0-5 5-5 9a5 5 0 0010 0c0-2-1-3.5-2-4.5 0 2-1 3.5-2 4 0-3.5-1-6.5-1-8.5z" fill="white" />
    </svg>
  );
}

function MercadoPagoLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <rect width="24" height="24" rx="6" fill="#009EE3" />
      <text x="12" y="16" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="8.5" fill="white">MP</text>
    </svg>
  );
}

function GeminiLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M12 2C12 2 13.5 8 18 9.5C13.5 11 12 17 12 17C12 17 10.5 11 6 9.5C10.5 8 12 2 12 2Z"
        fill="url(#gemini-grad)"
      />
      <defs>
        <linearGradient id="gemini-grad" x1="6" y1="2" x2="18" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="1" stopColor="#9C27B0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TrackerLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M8 8L4 12L8 16" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8L20 12L16 16" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6L11 18" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RestApiLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <rect width="24" height="24" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
      <path d="M5 12L8 9M8 9L5 6M8 9H12" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15H19" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HeroMockup() {
  return (
    <div
      className="mt-16 w-full max-w-5xl rounded-2xl overflow-hidden border border-zinc-800 relative landing-fade-6 text-left"
      style={{ boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 60px rgba(79,70,229,0.1)" }}
    >
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent 65%, #09090b 100%)" }}
      />
      <div className="h-10 bg-zinc-900 flex items-center gap-2 px-4 border-b border-zinc-800">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-amber-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <div className="ml-3 px-3 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-600">
          groware.io / visão-geral
        </div>
      </div>

      <div className="bg-zinc-950 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-100">Visão Geral</p>
            <p className="text-xs text-zinc-500">Performance consolidada do período</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 font-medium">
              <IconEye size={13} />
              Etapas
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-indigo-800/50 bg-indigo-600/20 text-xs text-indigo-400 font-medium whitespace-nowrap">
              Últimos 30 dias ▾
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { label: "Pageviews", value: "12.840", color: "text-indigo-400", bg: "bg-indigo-600/20", Icon: IconEye, trend: "+8,2%" },
            { label: "Cadastros", value: "1.247", color: "text-sky-400", bg: "bg-sky-600/20", Icon: IconUsers, trend: "+14,3%" },
            { label: "Checkouts", value: "312", color: "text-violet-400", bg: "bg-violet-600/20", Icon: IconCreditCard, trend: "+6,1%" },
            { label: "Pagamentos", value: "184", color: "text-amber-400", bg: "bg-amber-600/20", Icon: IconCreditCard, trend: "+11,7%" },
            { label: "Receita", value: "R$48,2k", color: "text-emerald-400", bg: "bg-emerald-600/20", Icon: IconCurrencyDollar, trend: "+12,4%" },
            { label: "Ticket Médio", value: "R$261", color: "text-amber-400", bg: "bg-amber-600/20", Icon: IconReceipt, trend: "" },
          ].map(({ label, value, color, bg, Icon, trend }) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-zinc-500 truncate">{label}</span>
                <div className={`flex h-5 w-5 items-center justify-center rounded-md shrink-0 ${bg}`}>
                  <Icon size={10} className={color} />
                </div>
              </div>
              <span className={`text-sm sm:text-base font-bold font-mono leading-none ${color}`}>{value}</span>
              {trend && (
                <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-emerald-950/60 rounded px-1 py-0.5 w-fit">
                  ↑ {trend}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-bold text-zinc-300 mb-3">Funil de Conversão</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Pageviews", value: 12840, pct: 100, color: "bg-indigo-500" },
                { label: "Cadastros", value: 1247, pct: 9.7, color: "bg-sky-500" },
                { label: "Checkouts", value: 312, pct: 25.0, color: "bg-violet-500" },
                { label: "Pagamentos", value: 184, pct: 58.9, color: "bg-amber-500" },
              ].map(({ label, value, pct, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-20 shrink-0 truncate">{label}</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color}/60 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 w-12 text-right">{value.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-bold text-zinc-300 mb-3">Receita por Canal</p>
            <div className="flex flex-col gap-2">
              {[
                { channel: "google / organic", revenue: "R$18.400", conv: "4,2%", color: "#6366f1" },
                { channel: "instagram / paid", revenue: "R$9.100", conv: "2,8%", color: "#f59e0b" },
                { channel: "(direct)", revenue: "R$8.900", conv: "5,1%", color: "#10b981" },
                { channel: "email", revenue: "R$7.200", conv: "6,8%", color: "#06b6d4" },
              ].map(({ channel, revenue, conv, color }) => (
                <div key={channel} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[10px] text-zinc-400 flex-1 truncate font-mono">{channel}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">{revenue}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{conv}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-6 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/25 mb-9 landing-fade-1">
        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
            <path d="M5 1L6.5 3.5H9L7 5.5L7.8 8.5L5 7L2.2 8.5L3 5.5L1 3.5H3.5L5 1Z" fill="white" />
          </svg>
        </div>
        <span className="text-xs font-medium text-indigo-300">
          Em acesso antecipado
          <span className="hidden sm:inline"> · Integração com Stripe disponível</span>
        </span>
      </div>

      <h1
        className="font-display font-extrabold tracking-[-0.04em] leading-[0.95] max-w-[860px] landing-fade-2"
        style={{ fontSize: "clamp(52px, 7vw, 92px)" }}
      >
        <span className="landing-grad-text">Do funil ao lucro real.</span>
        <br />
        <span className="text-zinc-400">Tudo num só lugar.</span>
      </h1>

      <p
        className="mt-6 text-zinc-400 max-w-[560px] leading-relaxed tracking-[-0.02em] landing-fade-3"
        style={{ fontSize: "clamp(16px, 2vw, 19px)" }}
      >
        MRR, canais de aquisição, P&L real e análise com IA — conectados em um único dashboard. Feito para founders de SaaS que querem crescer com clareza.
      </p>

      <div className="mt-11 landing-fade-4">
        <LandingCtaForm variant="hero" />
      </div>

      <p className="mt-3.5 text-xs text-zinc-600 font-mono landing-fade-5">
        Sem cartão de crédito · <span className="text-zinc-500">Grátis durante o beta</span>
      </p>

      <HeroMockup />
    </section>
  );
}

const stripItems = [
  "MRR & ARR",
  "Análise de Churn",
  "ROI por Canal",
  "P&L Real",
  "Análise com IA",
  "Integração Stripe",
  "Integração Asaas",
  "Rastreamento de Funil",
  "Landing Pages",
  "Debug de Eventos",
  "Multi-tenant",
  "tracker.js",
];

function StripSection() {
  const doubled = [...stripItems, ...stripItems];

  return (
    <div className="py-8 border-t border-b border-white/[0.04] overflow-hidden relative">
      <div
        className="absolute left-0 top-0 bottom-0 w-24 sm:w-48 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #09090b, transparent)" }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-24 sm:w-48 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #09090b, transparent)" }}
      />
      <div className="landing-strip-track">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
            <span className="text-xs text-zinc-700 font-mono uppercase tracking-widest">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProblemSection() {
  const problems = [
    {
      icon: "📊",
      title: "Dashboard do Stripe",
      desc: "Mostra receita — mas não de onde veio, quanto custou, ou qual é sua margem de verdade.",
    },
    {
      icon: "📋",
      title: "Planilhas",
      desc: "Atualizações manuais, fórmulas quebradas, sempre com um mês de atraso. Ninguém confia nos números.",
    },
    {
      icon: "📉",
      title: "Google Analytics",
      desc: "Pageviews e sessões — mas zero conexão com receita, assinaturas ou resultados reais do negócio.",
    },
  ];

  return (
    <section className="px-6 py-20 sm:py-28 max-w-6xl mx-auto">
      <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{"// o problema"}</p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[680px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        Seus dados estão em todo lugar,{" "}
        <span className="landing-accent-text">menos conectados.</span>
      </h2>
      <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-[500px] leading-relaxed tracking-[-0.02em]">
        MRR no Stripe. Custos numa planilha. Aquisição no Google Analytics. P&L no Excel. Nada conversa entre si
        — e você passa horas conectando os pontos manualmente.
      </p>

      <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {problems.map((p) => (
          <div
            key={p.title}
            className="bg-zinc-900/40 border border-red-500/10 rounded-2xl p-6 sm:p-7 hover:-translate-y-0.5 transition-transform"
          >
            <div className="text-3xl mb-4">{p.icon}</div>
            <h3 className="text-base font-semibold tracking-tight mb-2 text-zinc-400 line-through decoration-red-500/60">
              {p.title}
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 sm:p-7 bg-zinc-900/40 border border-indigo-500/20 rounded-2xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/[0.12] border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-lg">
          ✦
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight text-indigo-300 mb-1.5">
            O Groware conecta tudo isso.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Um script. Um webhook. Funil → MRR → canais → custos → margem → insight com IA — tudo em tempo real. Tudo que seu time de growth e seu CFO precisam, em um só lugar.
          </p>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    Icon: IconLayoutDashboard,
    title: "Visão Geral",
    desc: "Funil em tempo real, KPIs com variação vs período anterior e gráfico diário. Veja visitas → cadastros → checkouts → receita em uma só tela.",
    tags: ["funil", "KPIs", "diário"],
  },
  {
    Icon: IconRepeat,
    title: "Recorrência (MRR)",
    desc: "MRR, ARR, ARPU, LTV, Churn Rate, Revenue Churn. Sankey de fluxo de assinantes e gráfico de movimentação: Novo / Expansão / Contração / Churn.",
    tags: ["MRR", "ARR", "LTV", "churn"],
  },
  {
    Icon: IconCoin,
    title: "Financeiro",
    desc: "Receita bruta, líquida, descontos e ticket médio. Breakdown por método (PIX, cartão, boleto) e categoria de produto.",
    tags: ["receita", "ticket", "métodos"],
  },
  {
    Icon: IconTrendingDown,
    title: "Custos & P&L",
    desc: "Cadastre custos fixos e variáveis (absoluto ou % da receita). P&L em tempo real: Receita Bruta → Lucro Bruto → Lucro Real → Margem Real.",
    tags: ["P&L", "margem", "custos"],
  },
  {
    Icon: IconChartLine,
    title: "Canais de Aquisição",
    desc: "Receita, etapas do funil, taxa de conversão e ticket médio por canal de origem. Heatmap visual e tabela ordenável por qualquer coluna.",
    tags: ["UTMs", "fonte", "ROI"],
  },
  {
    Icon: IconFileText,
    title: "Landing Pages",
    desc: "Quais páginas de entrada geram mais receita? Métricas completas de funil por URL, com busca, ordenação e paginação.",
    tags: ["URL", "entrada", "conversão"],
  },
  {
    Icon: IconBolt,
    title: "Eventos & Debug",
    desc: "Tabela de eventos com atualização em tempo real. Filtre por tipo, modelo de cobrança, data. Alertas automáticos para IDs sem deduplicação.",
    tags: ["tempo real", "debug", "dedupe"],
  },
  {
    Icon: IconCreditCard,
    title: "Assinaturas",
    desc: "Ativo, em trial, em atraso, cancelado — com plano, intervalo, valor mensal normalizado e ID do cliente. Histórico completo.",
    tags: ["status", "planos", "intervalos"],
  },
  {
    Icon: IconChartBar,
    title: "Comparativo de Períodos",
    desc: "Compare dois intervalos de datas — visão geral, canais, financeiro ou landing pages. Lado a lado ou resumo por IA.",
    tags: ["diff", "tendências", "comparar"],
  },
];

function FeaturesSection() {
  return (
    <section id="funcionalidades" className="px-6 py-20 sm:py-28 max-w-6xl mx-auto">
      <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{"// funcionalidades"}</p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[680px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        Tudo que você precisa para{" "}
        <span className="landing-accent-text">crescer com clareza.</span>
      </h2>

      <div className="mt-12 sm:mt-16 border border-white/[0.04] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.04]">
        {features.map(({ Icon, title, desc, tags }) => (
          <div key={title} className="bg-zinc-950 p-6 sm:p-8 hover:bg-zinc-900/40 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/[0.12] border border-indigo-500/20 flex items-center justify-center mb-5">
              <Icon size={20} className="text-indigo-400" />
            </div>
            <h3 className="text-base font-bold tracking-tight mb-2">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const codeLines = [
  { ln: "1", parts: [{ c: "text-zinc-600", t: "// 1. Adicione ao seu <head>" }] },
  {
    ln: "2",
    parts: [
      { c: "text-pink-400", t: "<script" },
      { c: "text-indigo-400", t: " src" },
      { c: "text-zinc-500", t: "=" },
      { c: "text-green-400", t: '"https://groware.io/tracker.js"' },
    ],
  },
  {
    ln: "3",
    parts: [
      { c: "text-indigo-400", t: "  data-api-key" },
      { c: "text-zinc-500", t: "=" },
      { c: "text-green-400", t: '"tok_sua_chave_aqui"' },
      { c: "text-pink-400", t: "></script>" },
    ],
  },
  { ln: "4", parts: [] },
  { ln: "5", parts: [{ c: "text-zinc-600", t: "// 2. Rastreie eventos" }] },
  {
    ln: "6",
    parts: [
      { c: "text-indigo-400", t: "window" },
      { c: "text-zinc-500", t: "." },
      { c: "text-amber-400", t: "Groware" },
      { c: "text-zinc-500", t: "." },
      { c: "text-amber-400", t: "track" },
      { c: "text-zinc-500", t: "(" },
      { c: "text-green-400", t: "'signup'" },
      { c: "text-zinc-500", t: ", {" },
    ],
  },
  {
    ln: "7",
    parts: [
      { c: "text-indigo-400", t: "  customer_id" },
      { c: "text-zinc-500", t: ": " },
      { c: "text-amber-400", t: "hashAnonymous" },
      { c: "text-zinc-500", t: "(" },
      { c: "text-indigo-300", t: "user.id" },
      { c: "text-zinc-500", t: ")" },
    ],
  },
  { ln: "8", parts: [{ c: "text-zinc-500", t: "})" }] },
  { ln: "9", parts: [] },
  { ln: "10", parts: [{ c: "text-zinc-600", t: "// 3. Rastreie pagamentos (server-side)" }] },
  {
    ln: "11",
    parts: [
      { c: "text-indigo-400", t: "await " },
      { c: "text-amber-400", t: "fetch" },
      { c: "text-zinc-500", t: "(" },
      { c: "text-green-400", t: "'https://groware.io/api/track'" },
      { c: "text-zinc-500", t: ", {" },
    ],
  },
  {
    ln: "12",
    parts: [
      { c: "text-indigo-400", t: "  method" },
      { c: "text-zinc-500", t: ": " },
      { c: "text-green-400", t: "'POST'" },
      { c: "text-zinc-500", t: "," },
    ],
  },
  {
    ln: "13",
    parts: [
      { c: "text-indigo-400", t: "  body" },
      { c: "text-zinc-500", t: ": " },
      { c: "text-amber-400", t: "JSON" },
      { c: "text-zinc-500", t: "." },
      { c: "text-amber-400", t: "stringify" },
      { c: "text-zinc-500", t: "({" },
    ],
  },
  {
    ln: "14",
    parts: [
      { c: "text-indigo-400", t: "    event_type" },
      { c: "text-zinc-500", t: ": " },
      { c: "text-green-400", t: "'purchase'" },
      { c: "text-zinc-500", t: "," },
    ],
  },
  {
    ln: "15",
    parts: [
      { c: "text-indigo-400", t: "    gross_value" },
      { c: "text-zinc-500", t: ": " },
      { c: "text-indigo-300", t: "9990" },
      { c: "text-zinc-600", t: ", // centavos" },
    ],
  },
  {
    ln: "16",
    parts: [
      { c: "text-indigo-400", t: "    customer_id" },
      { c: "text-zinc-500", t: ": " },
      { c: "text-amber-400", t: "hashAnonymous" },
      { c: "text-zinc-500", t: "(" },
      { c: "text-indigo-300", t: "user.id" },
      { c: "text-zinc-500", t: ")" },
    ],
  },
  { ln: "17", parts: [{ c: "text-zinc-500", t: "  })" }] },
  { ln: "18", parts: [{ c: "text-zinc-500", t: "})" }] },
];

const installSteps = [
  {
    num: "1",
    title: "Adicione a tag de script",
    desc: "Adicione uma linha no seu <head> com sua API Key. Pageviews, UTMs, device e sessão são rastreados automaticamente.",
    time: "~1 min",
  },
  {
    num: "2",
    title: "Rastreie os eventos do funil",
    desc: "Chame Groware.track() nos eventos de cadastro, checkout e pagamento. O SDK é < 3 kB.",
    time: "~5 min",
  },
  {
    num: "3",
    title: "Conecte seu gateway",
    desc: "Cole sua Chave Restrita do Stripe. O Groware importa o histórico completo e começa a receber webhooks automaticamente.",
    time: "~2 min",
  },
];

function CodeSection() {
  return (
    <section className="px-6 py-20 sm:py-28 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      <div
        className="rounded-2xl overflow-hidden border border-zinc-800 overflow-x-auto"
        style={{ background: "#0a0a0f", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
      >
        <div className="bg-zinc-900 px-5 py-3.5 flex items-center gap-2 border-b border-zinc-800">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-amber-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-2 font-mono text-xs text-zinc-600">tracker.js · instalação</span>
        </div>
        <div className="p-5 sm:p-7 font-mono text-xs leading-[1.9] overflow-x-auto">
          <div className="min-w-[480px]">
            {codeLines.map(({ ln, parts }) => (
              <div key={ln} className="flex gap-4 whitespace-nowrap">
                <span className="text-zinc-700 select-none min-w-[20px] text-right">{ln}</span>
                <span>
                  {parts.map((p, i) => (
                    <span key={i} className={p.c}>
                      {p.t}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{"// configuração"}</p>
        <h2
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-3"
          style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}
        >
          Do zero ao analytics completo
          <br />
          <span className="landing-accent-text">em 5 minutos.</span>
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          Uma tag de script para funil e aquisição. Um webhook para pagamentos e assinaturas. Sem alterações no backend.
        </p>
        <div className="flex flex-col divide-y divide-zinc-800/60">
          {installSteps.map(({ num, title, desc, time }) => (
            <div key={num} className="flex gap-5 py-6 sm:py-7">
              <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-indigo-600/[0.12] border border-indigo-500/20 flex items-center justify-center font-mono text-sm font-medium text-indigo-300">
                {num}
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight mb-1.5">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
                <span className="inline-block mt-2.5 font-mono text-xs px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-indigo-300">
                  {time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const integrations = [
  {
    Logo: StripeLogo,
    name: "Stripe",
    desc: "Histórico completo, assinaturas, renovações, churn. Chave Restrita — somente leitura, sem risco.",
    status: "live",
  },
  {
    Logo: AsaasLogo,
    name: "Asaas",
    desc: "PIX, boleto, cartão. O gateway dominante para SaaS — integração nativa completa.",
    status: "soon",
  },
  {
    Logo: KiwifyLogo,
    name: "Kiwify",
    desc: "Infoprodutos e produtos digitais. Eventos de pagamento, reembolsos e ciclo de vida da assinatura.",
    status: "soon",
  },
  {
    Logo: HotmartLogo,
    name: "Hotmart",
    desc: "Integração com marketplace digital. Compras, assinaturas e rastreamento de afiliados.",
    status: "soon",
  },
  {
    Logo: MercadoPagoLogo,
    name: "Mercado Pago",
    desc: "Pagamentos para marketplace e e-commerce. A plataforma mais popular da América Latina.",
    status: "soon",
  },
  {
    Logo: TrackerLogo,
    name: "tracker.js",
    desc: "Seu fallback universal. Funciona com qualquer checkout. < 3 kB, zero dependências, auto-tracking.",
    status: "live",
  },
  {
    Logo: GeminiLogo,
    name: "Gemini AI",
    desc: "Powered by Google Gemini. Analisa P&L + funil + canais + recorrência. Streaming em tempo real.",
    status: "live",
  },
  {
    Logo: RestApiLogo,
    name: "REST API",
    desc: "Envie eventos server-side de qualquer linguagem. Node, Python, Go, Ruby, PHP — qualquer stack.",
    status: "live",
  },
];

function IntegrationsSection() {
  return (
    <section id="integracoes" className="px-6 py-20 sm:py-28 max-w-6xl mx-auto">
      <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{"// integrações"}</p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[600px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        Funciona com <span className="landing-accent-text">a sua stack.</span>
      </h2>
      <p className="mt-5 text-base text-zinc-400 max-w-[500px] leading-relaxed tracking-[-0.02em]">
        Integrações nativas com gateways fazem o trabalho pesado. Sincronização de histórico, webhooks em tempo real e atribuição de conversão integrados.
      </p>

      <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {integrations.map(({ Logo, name, desc, status }) => (
          <div
            key={name}
            className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-3 hover:border-indigo-500/25 hover:shadow-[0_8px_32px_rgba(79,70,229,0.1)] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Logo />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold tracking-tight">{name}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed mt-1">{desc}</p>
            </div>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded w-fit ${
                status === "live" ? "bg-emerald-400/10 text-emerald-400" : "bg-indigo-600/10 text-indigo-400"
              }`}
            >
              {status === "live" ? "● Disponível" : "⟳ Em breve"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section id="ia" className="px-6 py-20 sm:py-28 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
      <div
        className="rounded-xl overflow-hidden border border-zinc-800"
        style={{ background: "#0c0c12" }}
      >
        <div className="bg-zinc-900 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <IconSparkles size={15} className="text-indigo-400" />
              <span className="text-sm font-bold text-zinc-100">Análise com IA</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Gemini analisa seus custos e identifica oportunidades</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-800 transition-colors whitespace-nowrap">
              <IconTrendingUp size={13} />
              Comparar Períodos
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors whitespace-nowrap">
              <IconSparkles size={13} />
              Analisar com IA
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              P&L do Período — Jan 2026
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Receita Bruta", value: "R$48.240", color: "text-emerald-400" },
                { label: "Custos Variáveis", value: "− R$7.120", color: "text-red-400" },
                { label: "Lucro Operacional", value: "R$41.120", color: "text-zinc-300" },
                { label: "Custos Fixos", value: "− R$11.400", color: "text-red-400" },
                { label: "Lucro Líquido", value: "R$29.720", color: "text-emerald-400" },
                { label: "Margem Real", value: "61,6%", color: "text-emerald-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{label}</span>
                  <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-indigo-500/20 bg-indigo-600/[0.04] p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconSparkles size={13} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">Análise Gerada · Gemini 1.5 Flash</span>
            </div>
            <div className="font-mono text-xs leading-[1.8] text-zinc-400 space-y-1">
              <p><span className="text-zinc-500">## Diagnóstico</span></p>
              <p>Sua margem real de <span className="text-emerald-400 font-semibold">61,6%</span> está <span className="text-emerald-400">acima da média</span> para SaaS B2C.</p>
              <p><span className="text-zinc-500">## Oportunidades</span></p>
              <p><span className="text-amber-400">⚠</span> Custos fixos representam <span className="text-amber-400">23,6%</span> da receita.</p>
              <p><span className="text-amber-400">⚠</span> Taxa de gateway <span className="text-amber-400">R$4.200</span> → avalie plano negociado.</p>
              <p><span className="text-emerald-400">✓</span> Ticket médio cresceu <span className="text-emerald-400">+8,1%</span> — sinal de upsell.</p>
              <p><span className="text-zinc-500">## Recomendações</span></p>
              <p>1. Negociar taxa de processamento com Stripe</p>
              <p>2. Revisar ferramentas SaaS redundantes</p>
              <p>3. Acelerar upsell com expansão de MRR<span className="landing-blink-cursor" /></p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{"// análise com ia"}</p>
        <h2
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-4"
          style={{ fontSize: "clamp(28px, 3.5vw, 48px)" }}
        >
          P&L + funil + canais.
          <br />
          <span className="landing-accent-text">IA analisa tudo.</span>
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          Clique em &quot;Analisar com IA&quot; na tela de Custos e o Groware envia seu P&L completo, funil e canais para o Gemini — e retorna insights priorizados com streaming em tempo real.
        </p>
        <div className="flex flex-col gap-6 sm:gap-7">
          {[
            {
              Icon: IconSearch,
              title: "Contexto real do negócio",
              desc: "A IA recebe P&L detalhado (fixos, variáveis, margens), funil com taxas de conversão, ticket médio e nome da organização.",
            },
            {
              Icon: IconTrendingUp,
              title: "Comparativo de períodos",
              desc: "Compare dois intervalos de datas com análise por IA. Entenda o que mudou entre períodos com uma resposta clara e estruturada.",
            },
            {
              Icon: IconBolt,
              title: "Streaming em tempo real",
              desc: "A resposta chega fragmento por fragmento, diretamente no dashboard. Cursor piscando enquanto a IA pensa.",
            },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <Icon size={18} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight mb-1">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricsSection() {
  const channelRows = [
    { name: "google / organic", revenue: "R$18.400", conv: "4,2%", signup: "842", payment: "109", trend: "+18%", up: true },
    { name: "instagram / paid", revenue: "R$9.100", conv: "2,8%", signup: "201", payment: "42", trend: "+3%", up: false },
    { name: "(direct)", revenue: "R$8.900", conv: "5,1%", signup: "198", payment: "34", trend: "+22%", up: true },
    { name: "email", revenue: "R$7.200", conv: "6,8%", signup: "124", payment: "23", trend: "+22%", up: true },
    { name: "twitter / x", revenue: "R$2.100", conv: "1,1%", signup: "72", payment: "11", trend: "−4%", up: false, negative: true },
  ];

  return (
    <section className="px-6 py-20 sm:py-28 max-w-6xl mx-auto">
      <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">
        {"// atribuição de receita"}
      </p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[680px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        Saiba exatamente de onde <span className="landing-accent-text">vem cada real.</span>
      </h2>
      <p className="mt-5 text-base text-zinc-400 max-w-[500px] leading-relaxed tracking-[-0.02em]">
        Cada pagamento é atribuído à sua fonte de aquisição — mesmo pagamentos feitos via webhook do gateway, meses após o primeiro clique.
      </p>

      <div className="mt-12 sm:mt-16 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-5 sm:px-6 py-5 border-b border-zinc-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Detalhamento por Canal</h3>
            <p className="text-xs text-zinc-500 mt-0.5">5 canais com receita · ordenado por receita</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["Receita", "Conversão", "Ticket"].map((s, i) => (
              <span
                key={s}
                className={`text-[10px] font-semibold px-2 py-1 rounded border ${
                  i === 0
                    ? "border-indigo-600/50 bg-indigo-600/20 text-indigo-400"
                    : "border-zinc-700 text-zinc-500"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[540px]">
            <div className="grid grid-cols-6 px-5 sm:px-6 py-3 border-b border-zinc-800">
              {["Canal", "Cadastros", "Pagamentos", "Conversão", "Receita", "vs anterior"].map((h) => (
                <span key={h} className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</span>
              ))}
            </div>
            {channelRows.map(({ name, revenue, conv, signup, payment, trend, up, negative }) => (
              <div
                key={name}
                className="grid grid-cols-6 px-5 sm:px-6 py-3.5 border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/30 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: up ? "#6366f1" : negative ? "#f87171" : "#71717a" }}
                  />
                  <span className="font-mono text-xs text-zinc-300 truncate">{name}</span>
                </span>
                <span className="font-mono text-sm text-zinc-400">{signup}</span>
                <span className="font-mono text-sm text-zinc-400">{payment}</span>
                <span
                  className={`font-mono text-sm font-semibold ${
                    parseFloat(conv) >= 3 ? "text-emerald-400" : parseFloat(conv) >= 1 ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {conv}
                </span>
                <span className="font-mono text-sm font-bold text-emerald-400">{revenue}</span>
                <span
                  className={`font-mono text-sm ${
                    negative ? "text-red-400" : up ? "text-emerald-400" : "text-zinc-500"
                  }`}
                >
                  {negative ? "↓ " : up ? "↑ " : ""}
                  {trend}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section
      id="acesso-antecipado"
      className="px-6 py-32 sm:py-40 flex flex-col items-center text-center relative overflow-hidden"
    >
      <div
        className="absolute w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(79,70,229,0.15), transparent 70%)" }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/20 mb-8">
          <span className="text-xs font-mono text-indigo-400 tracking-[0.03em]">GRÁTIS DURANTE O BETA</span>
        </div>
        <h2
          className="font-display font-extrabold tracking-[-0.04em] leading-[0.98] max-w-[680px]"
          style={{ fontSize: "clamp(30px, 5vw, 70px)" }}
        >
          Pare de adivinhar.
          <br />
          Comece a <span className="landing-purple-grad">crescer com clareza.</span>
        </h2>
        <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-[460px] w-full leading-relaxed tracking-[-0.02em] px-2 sm:px-0">
          Acesse o Groware com antecedência e transforme seus dados espalhados em decisões de crescimento — antes que sua concorrência o faça.
        </p>
        <div className="mt-10 sm:mt-12">
          <LandingCtaForm variant="cta" />
        </div>
        <p className="mt-4 text-xs text-zinc-700 font-mono">
          Grátis durante o beta · Sem cartão · Configuração em 5 minutos
        </p>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 overflow-x-hidden">
      <div className="landing-grid-bg fixed inset-0 pointer-events-none z-0" />
      <div
        className="fixed pointer-events-none z-0 rounded-full"
        style={{
          width: "700px",
          height: "700px",
          background: "#4f46e5",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          filter: "blur(80px)",
          opacity: "0.2",
        }}
      />
      <div
        className="fixed pointer-events-none z-0 rounded-full"
        style={{
          width: "400px",
          height: "400px",
          background: "#6366f1",
          bottom: "10%",
          right: "-10%",
          filter: "blur(80px)",
          opacity: "0.09",
        }}
      />
      <div className="relative z-10">
        <LandingNav />
        <HeroSection />
        <StripSection />
        <ProblemSection />
        <FeaturesSection />
        <CodeSection />
        <IntegrationsSection />
        <AiSection />
        <MetricsSection />
        <CtaSection />
        <LandingFooter />
      </div>
    </div>
  );
}
