import { ForgotPasswordForm } from "./_components/forgot-password-form";
import { GrowareLogo } from "@/components/groware-logo";

export const metadata = {
  title: "Recuperar senha",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <GrowareLogo size="sm" />

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
