import { Suspense } from "react";
import { ResetPasswordForm } from "./_components/reset-password-form";
import { GrowareLogo } from "@/components/groware-logo";

export const metadata = {
  title: "Nova senha",
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <GrowareLogo size="sm" />

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100">Nova senha</h2>
          <p className="text-sm text-zinc-500">
            Escolha uma senha segura para sua conta.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <Suspense
            fallback={
              <div className="text-center py-4 text-sm text-zinc-600">
                Carregando...
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
