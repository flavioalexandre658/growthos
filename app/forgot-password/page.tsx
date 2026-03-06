import { IconChartBar } from "@tabler/icons-react";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

export const metadata = {
  title: "Recuperar senha | Groware",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <IconChartBar size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-100">Groware</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100">Recuperar senha</h2>
          <p className="text-sm text-zinc-500">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
