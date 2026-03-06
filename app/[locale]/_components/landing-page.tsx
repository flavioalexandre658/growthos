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
import { useTranslations } from "next-intl";
import { LandingNav } from "./landing-nav";
import { LandingCtaForm } from "./landing-cta-form";
import { LandingFooter } from "./landing-footer";

const featureIcons = [
  IconLayoutDashboard,
  IconRepeat,
  IconCoin,
  IconTrendingDown,
  IconChartLine,
  IconFileText,
  IconBolt,
  IconCreditCard,
  IconChartBar,
];

const aiFeatureIcons = [IconSearch, IconTrendingUp, IconBolt];

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

const integrationLogos = [
  StripeLogo,
  AsaasLogo,
  KiwifyLogo,
  HotmartLogo,
  MercadoPagoLogo,
  TrackerLogo,
  GeminiLogo,
  RestApiLogo,
];

function HeroMockup() {
  const t = useTranslations("landing.hero");

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
          {t("mockupLabel")}
        </div>
      </div>

      <div className="bg-zinc-950 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-100">{t("overview")}</p>
            <p className="text-xs text-zinc-500">{t("overviewSub")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 font-medium">
              <IconEye size={13} />
              {t("stages")}
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-indigo-800/50 bg-indigo-600/20 text-xs text-indigo-400 font-medium whitespace-nowrap">
              {t("last30")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { labelKey: "kpis.pageviews", value: "12.840", color: "text-indigo-400", bg: "bg-indigo-600/20", Icon: IconEye, trend: "+8,2%" },
            { labelKey: "kpis.signups", value: "1.247", color: "text-sky-400", bg: "bg-sky-600/20", Icon: IconUsers, trend: "+14,3%" },
            { labelKey: "kpis.checkouts", value: "312", color: "text-violet-400", bg: "bg-violet-600/20", Icon: IconCreditCard, trend: "+6,1%" },
            { labelKey: "kpis.payments", value: "184", color: "text-amber-400", bg: "bg-amber-600/20", Icon: IconCreditCard, trend: "+11,7%" },
            { labelKey: "kpis.revenue", value: "R$48,2k", color: "text-emerald-400", bg: "bg-emerald-600/20", Icon: IconCurrencyDollar, trend: "+12,4%" },
            { labelKey: "kpis.avgTicket", value: "R$261", color: "text-amber-400", bg: "bg-amber-600/20", Icon: IconReceipt, trend: "" },
          ].map(({ labelKey, value, color, bg, Icon, trend }) => (
            <div key={labelKey} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-zinc-500 truncate">{t(labelKey as Parameters<typeof t>[0])}</span>
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
            <p className="text-xs font-bold text-zinc-300 mb-3">{t("funnel")}</p>
            <div className="flex flex-col gap-2">
              {[
                { labelKey: "kpis.pageviews", value: 12840, pct: 100, color: "bg-indigo-500" },
                { labelKey: "kpis.signups", value: 1247, pct: 9.7, color: "bg-sky-500" },
                { labelKey: "kpis.checkouts", value: 312, pct: 25.0, color: "bg-violet-500" },
                { labelKey: "kpis.payments", value: 184, pct: 58.9, color: "bg-amber-500" },
              ].map(({ labelKey, value, pct, color }) => (
                <div key={labelKey} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-20 shrink-0 truncate">{t(labelKey as Parameters<typeof t>[0])}</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color}/60 rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 w-12 text-right">{value.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-bold text-zinc-300 mb-3">{t("revenueByChannel")}</p>
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
  const t = useTranslations("landing.hero");

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-6 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-500/25 mb-9 landing-fade-1">
        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
            <path d="M5 1L6.5 3.5H9L7 5.5L7.8 8.5L5 7L2.2 8.5L3 5.5L1 3.5H3.5L5 1Z" fill="white" />
          </svg>
        </div>
        <span className="text-xs font-medium text-indigo-300">
          {t("badge")}
          <span className="hidden sm:inline">{t("badgeSuffix")}</span>
        </span>
      </div>

      <h1
        className="font-display font-extrabold tracking-[-0.04em] leading-[0.95] max-w-[860px] landing-fade-2"
        style={{ fontSize: "clamp(52px, 7vw, 92px)" }}
      >
        <span className="landing-grad-text">{t("headline1")}</span>
        <br />
        <span className="text-zinc-400">{t("headline2")}</span>
      </h1>

      <p
        className="mt-6 text-zinc-400 max-w-[560px] leading-relaxed tracking-[-0.02em] landing-fade-3"
        style={{ fontSize: "clamp(16px, 2vw, 19px)" }}
      >
        {t("subheadline")}
      </p>

      <div className="mt-11 landing-fade-4">
        <LandingCtaForm variant="hero" />
      </div>

      <p className="mt-3.5 text-xs text-zinc-600 font-mono landing-fade-5">
        {t("disclaimer")}
      </p>

      <HeroMockup />
    </section>
  );
}

function StripSection() {
  const t = useTranslations("landing");
  const stripItems = t.raw("strip") as string[];
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
  const t = useTranslations("landing.problem");
  const items = t.raw("items") as Array<{ icon: string; title: string; desc: string }>;

  return (
    <section className="px-6 py-20 sm:py-28 max-w-6xl mx-auto">
      <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{t("label")}</p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[680px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        {t("headline1")}{" "}
        <span className="landing-accent-text">{t("headline2")}</span>
      </h2>
      <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-[500px] leading-relaxed tracking-[-0.02em]">
        {t("description")}
      </p>

      <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((p) => (
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
            {t("solutionTitle")}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t("solutionDesc")}
          </p>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const t = useTranslations("landing.features");
  const items = t.raw("items") as Array<{ title: string; desc: string; tags: string[] }>;

  return (
    <section id="funcionalidades" className="px-6 py-20 sm:py-28 max-w-6xl mx-auto">
      <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{t("label")}</p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[680px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        {t("headline1")}{" "}
        <span className="landing-accent-text">{t("headline2")}</span>
      </h2>

      <div className="mt-12 sm:mt-16 border border-white/[0.04] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-white/[0.04]">
        {items.map(({ title, desc, tags }, idx) => {
          const Icon = featureIcons[idx];
          return (
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
          );
        })}
      </div>
    </section>
  );
}

function CodeSection() {
  const t = useTranslations("landing.code");
  const steps = t.raw("steps") as Array<{ title: string; desc: string; time: string }>;

  const codeLines = [
    { ln: "1", parts: [{ c: "text-zinc-600", t: t("codeComment1") }] },
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
        { c: "text-green-400", t: '"tok_your_key_here"' },
        { c: "text-pink-400", t: "></script>" },
      ],
    },
    { ln: "4", parts: [] },
    { ln: "5", parts: [{ c: "text-zinc-600", t: t("codeComment2") }] },
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
    { ln: "10", parts: [{ c: "text-zinc-600", t: t("codeComment3") }] },
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
        { c: "text-indigo-300", t: "99.90" },
        { c: "text-zinc-500", t: "," },
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
          <span className="ml-2 font-mono text-xs text-zinc-600">{t("tabLabel")}</span>
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
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{t("label")}</p>
        <h2
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-3"
          style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}
        >
          {t("headline1")}
          <br />
          <span className="landing-accent-text">{t("headline2")}</span>
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          {t("description")}
        </p>
        <div className="flex flex-col divide-y divide-zinc-800/60">
          {steps.map(({ title, desc, time }, idx) => (
            <div key={idx} className="flex gap-5 py-6 sm:py-7">
              <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-indigo-600/[0.12] border border-indigo-500/20 flex items-center justify-center font-mono text-sm font-medium text-indigo-300">
                {idx + 1}
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

function IntegrationsSection() {
  const t = useTranslations("landing.integrations");
  const items = t.raw("items") as Array<{ name: string; desc: string; status: string }>;

  return (
    <section id="integracoes" className="px-6 py-20 sm:py-28 max-w-6xl mx-auto">
      <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{t("label")}</p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[600px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        {t("headline1")} <span className="landing-accent-text">{t("headline2")}</span>
      </h2>
      <p className="mt-5 text-base text-zinc-400 max-w-[500px] leading-relaxed tracking-[-0.02em]">
        {t("description")}
      </p>

      <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {items.map(({ name, desc, status }, idx) => {
          const Logo = integrationLogos[idx];
          return (
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
                {status === "live" ? t("statusLive") : t("statusSoon")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AiSection() {
  const t = useTranslations("landing.ai");
  const features = t.raw("features") as Array<{ title: string; desc: string }>;
  const plItems = t.raw("mockupPlItems") as Array<{ label: string; value: string }>;
  const plColors = ["text-emerald-400", "text-red-400", "text-zinc-300", "text-red-400", "text-emerald-400", "text-emerald-400"];

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
              <span className="text-sm font-bold text-zinc-100">{t("panelTitle")}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{t("panelSub")}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-800 transition-colors whitespace-nowrap">
              <IconTrendingUp size={13} />
              {t("compareBtn")}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors whitespace-nowrap">
              <IconSparkles size={13} />
              {t("analyzeBtn")}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              {t("plLabel")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {plItems.map(({ label, value }, idx) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">{label}</span>
                  <span className={`text-sm font-bold font-mono ${plColors[idx]}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-indigo-500/20 bg-indigo-600/[0.04] p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconSparkles size={13} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">{t("aiLabel")}</span>
            </div>
            <div className="font-mono text-xs leading-[1.8] text-zinc-400 space-y-1">
              <p><span className="text-zinc-500">{t("mockupDiagnosisHeader")}</span></p>
              <p>{t.rich("mockupDiagnosisLine", {
                highlight: (chunks) => <span className="text-emerald-400 font-semibold">{chunks}</span>,
                above: (chunks) => <span className="text-emerald-400">{chunks}</span>,
              })}</p>
              <p><span className="text-zinc-500">{t("mockupOpportunitiesHeader")}</span></p>
              <p><span className="text-amber-400">⚠</span> {t.rich("mockupOp1", {
                warn: (chunks) => <span className="text-amber-400">{chunks}</span>,
              })}</p>
              <p><span className="text-amber-400">⚠</span> {t.rich("mockupOp2", {
                warn: (chunks) => <span className="text-amber-400">{chunks}</span>,
              })}</p>
              <p><span className="text-emerald-400">✓</span> {t.rich("mockupOp3", {
                good: (chunks) => <span className="text-emerald-400">{chunks}</span>,
              })}</p>
              <p><span className="text-zinc-500">{t("mockupRecsHeader")}</span></p>
              <p>{t("mockupRec1")}</p>
              <p>{t("mockupRec2")}</p>
              <p>{t("mockupRec3")}<span className="landing-blink-cursor" /></p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{t("label")}</p>
        <h2
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-4"
          style={{ fontSize: "clamp(28px, 3.5vw, 48px)" }}
        >
          {t("headline1")}
          <br />
          <span className="landing-accent-text">{t("headline2")}</span>
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          {t("description")}
        </p>
        <div className="flex flex-col gap-6 sm:gap-7">
          {features.map(({ title, desc }, idx) => {
            const Icon = aiFeatureIcons[idx];
            return (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                  <Icon size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight mb-1">{title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MetricsSection() {
  const t = useTranslations("landing.metrics");
  const filters = t.raw("filters") as string[];

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
        {t("label")}
      </p>
      <h2
        className="font-display font-extrabold tracking-[-0.04em] leading-[1] max-w-[680px]"
        style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
      >
        {t("headline1")} <span className="landing-accent-text">{t("headline2")}</span>
      </h2>
      <p className="mt-5 text-base text-zinc-400 max-w-[500px] leading-relaxed tracking-[-0.02em]">
        {t("description")}
      </p>

      <div className="mt-12 sm:mt-16 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-5 sm:px-6 py-5 border-b border-zinc-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{t("tableTitle")}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{t("tableSub")}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((s, i) => (
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
              {[
                t("columns.channel"),
                t("columns.signups"),
                t("columns.payments"),
                t("columns.conversion"),
                t("columns.revenue"),
                t("columns.vs"),
              ].map((h) => (
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
  const t = useTranslations("landing.ctaSection");

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
          <span className="text-xs font-mono text-indigo-400 tracking-[0.03em]">{t("badge")}</span>
        </div>
        <h2
          className="font-display font-extrabold tracking-[-0.04em] leading-[0.98] max-w-[680px]"
          style={{ fontSize: "clamp(30px, 5vw, 70px)" }}
        >
          {t("headline1")}
          <br />
          {t("headline2")} <span className="landing-purple-grad">{t("headline3")}</span>
        </h2>
        <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-[460px] w-full leading-relaxed tracking-[-0.02em] px-2 sm:px-0">
          {t("description")}
        </p>
        <div className="mt-10 sm:mt-12">
          <LandingCtaForm variant="cta" />
        </div>
        <p className="mt-4 text-xs text-zinc-700 font-mono">
          {t("disclaimer")}
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
