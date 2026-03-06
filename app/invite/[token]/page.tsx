import { IconChartBar } from "@tabler/icons-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getInviteByToken } from "@/actions/org-members/accept-invite.action";
import { AcceptInviteContent } from "./_components/accept-invite-content";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Aceitar convite | Groware",
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const [session, invite] = await Promise.all([
    getServerSession(authOptions),
    getInviteByToken(token),
  ]);

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
          <h2 className="text-2xl font-bold text-zinc-100">Convite de equipe</h2>
          <p className="text-sm text-zinc-500">
            Você foi convidado para colaborar em um workspace do Groware.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
          <AcceptInviteContent
            token={token}
            invite={invite}
            isLoggedIn={!!session?.user}
            userEmail={session?.user?.email}
          />
        </div>
      </div>
    </main>
  );
}
