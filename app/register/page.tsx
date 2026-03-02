import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { RegisterForm } from "./_components/register-form";
import { IconChartBar } from "@tabler/icons-react";

export const metadata = {
  title: "Criar conta — GrowthOS",
};

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-zinc-900/50 border-r border-zinc-800/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-violet-950/20" />
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
              Setup em minutos
            </p>
            <h1 className="text-4xl font-bold text-zinc-100 leading-tight">
              Cole um script.
              <br />
              Veja tudo crescer.
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Um tracker.js no seu site e você já tem receita por canal, funil
              de conversão, análise financeira e IA comparando períodos.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { step: "01", label: "Crie sua organização" },
              { step: "02", label: "Configure o funil de conversão" },
              { step: "03", label: "Copie e cole o snippet no <head>" },
              { step: "04", label: "Veja os dados chegando em tempo real" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-500/60">
                  {item.step}
                </span>
                <span className="text-sm text-zinc-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-zinc-700">
            © {new Date().getFullYear()} GrowthOS. Gratuito para começar.
          </p>
        </div>
      </div>

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
            <h2 className="text-2xl font-bold text-zinc-100">Crie sua conta</h2>
            <p className="text-sm text-zinc-500">
              Comece a rastrear seus dados de crescimento em minutos.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
            <RegisterForm />
          </div>

          <p className="text-center text-xs text-zinc-700">
            Ao criar uma conta, você concorda com nossos termos de uso.
          </p>
        </div>
      </div>
    </main>
  );
}
