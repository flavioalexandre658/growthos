import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { LoginForm } from "./_components/login-form";
import { IconChartBar } from "@tabler/icons-react";

export const metadata = {
  title: "Login — GrowthOS",
};

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/organizations");
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-zinc-900/50 border-r border-zinc-800/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-violet-950/20" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute top-10 left-10 z-10 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <IconChartBar size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-100 tracking-tight">GrowthOS</span>
        </div>

        <div className="relative z-10 w-full max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Growth · Analytics · IA
            </p>
            <h1 className="text-4xl font-bold text-zinc-100 leading-tight">
              Dados que
              <br />
              transformam decisões.
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Visualize receita, custos e conversão em tempo real. Identifique
              oportunidades com análise inteligente.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500/60" />
              <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
              <div className="h-2 w-2 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-zinc-600 font-mono">dashboard — visão geral</span>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Receita", value: "R$ 47.2k", delta: "+12%", up: true },
                  { label: "Conversão", value: "3.8%", delta: "+0.4pp", up: true },
                  { label: "Ticket médio", value: "R$ 89", delta: "-2%", up: false },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg bg-zinc-800/50 px-3 py-2.5">
                    <p className="text-xs text-zinc-500 mb-1">{kpi.label}</p>
                    <p className="text-sm font-bold text-zinc-100 tabular-nums">{kpi.value}</p>
                    <p className={`text-xs font-medium mt-0.5 ${kpi.up ? "text-emerald-400" : "text-red-400"}`}>
                      {kpi.delta}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">Receita — últimos 7 dias</span>
                  <span className="text-xs text-indigo-400 font-medium">+18% vs semana anterior</span>
                </div>
                <div className="flex items-end gap-1" style={{ height: 64 }}>
                  {[35, 52, 44, 68, 58, 72, 88].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${i === 6 ? "bg-indigo-500" : "bg-indigo-500/30"}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                    <div key={d} className="flex-1 text-center text-zinc-700 text-[9px]">{d}</div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                <div className="flex -space-x-1.5">
                  {["bg-indigo-500", "bg-violet-500", "bg-emerald-500"].map((c, i) => (
                    <div key={i} className={`h-5 w-5 rounded-full ${c} border-2 border-zinc-900`} />
                  ))}
                </div>
                <span className="text-xs text-zinc-600">3 canais ativos · Instagram, Google, Direto</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-700">
            © {new Date().getFullYear()} GrowthOS · Acompanhamento em tempo real de receita, funil e canais.
          </p>
        </div>
      </div>

      {/* Right panel — login */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1 lg:hidden">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <IconChartBar size={18} className="text-white" />
              </div>
              <span className="text-sm font-bold text-zinc-100">GrowthOS</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-100">
              Acesso administrativo
            </h2>
            <p className="text-sm text-zinc-500">
              Use suas credenciais de admin para acessar o painel.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-zinc-600">
            Não tem conta?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
