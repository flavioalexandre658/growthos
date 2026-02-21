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
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-zinc-900/50 border-r border-zinc-800/50 relative overflow-hidden">
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

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <IconChartBar size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-100 tracking-tight">
              GrowthOS
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Convitede · Analytics
            </p>
            <h1 className="text-4xl font-bold text-zinc-100 leading-tight">
              Entenda onde está
              <br />
              o crescimento.
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Receita por canal, templates que convertem, funil de pagamento e
              comparativos de período — tudo em um lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Receita por canal", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/20" },
              { label: "Funil de conversão", color: "bg-violet-500/20 text-violet-400 border-violet-500/20" },
              { label: "Top templates", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" },
              { label: "Comparativo de período", color: "bg-amber-500/20 text-amber-400 border-amber-500/20" },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${item.color}`}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-zinc-700">
            © {new Date().getFullYear()} Convitede. Acesso restrito.
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

          <p className="text-center text-xs text-zinc-700">
            Acesso restrito a administradores do sistema.
          </p>
        </div>
      </div>
    </main>
  );
}
