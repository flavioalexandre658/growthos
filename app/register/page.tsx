import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { RegisterForm } from "./_components/register-form";
import {
  IconChartBar,
  IconChartLine,
  IconTargetArrow,
  IconSparkles,
} from "@tabler/icons-react";

export const metadata = {
  title: "Criar conta — GrowthOS",
};

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/organizations");
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-zinc-900/50 border-r border-zinc-800/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-violet-950/20" />
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
              Inteligência de Crescimento
            </p>
            <h1 className="text-4xl font-bold text-zinc-100 leading-tight">
              A inteligência
              <br />
              por trás do seu
              <br />
              crescimento.
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Descubra onde está o lucro, onde está o desperdício e o que
              otimizar primeiro — com dados e análise inteligente.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: IconChartLine,
                title: "Receita em tempo real",
                description:
                  "Faturamento bruto, líquido, ticket médio e margem por canal — tudo atualizado automaticamente.",
                color: "text-indigo-400",
                bg: "bg-indigo-500/10 border-indigo-500/20",
              },
              {
                icon: IconTargetArrow,
                title: "Funil de conversão",
                description:
                  "Visualize cada etapa da jornada e identifique exatamente onde os clientes estão saindo.",
                color: "text-violet-400",
                bg: "bg-violet-500/10 border-violet-500/20",
              },
              {
                icon: IconSparkles,
                title: "Análise com IA",
                description:
                  "Compare períodos e receba relatórios automáticos sobre oportunidades de otimização de lucro.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`flex gap-3.5 rounded-xl border p-4 ${item.bg}`}
              >
                <div className={`mt-0.5 shrink-0 ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <div className="space-y-0.5">
                  <p className={`text-sm font-semibold ${item.color}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-700">
            © {new Date().getFullYear()} GrowthOS · Decisões melhores, crescimento consistente.
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
