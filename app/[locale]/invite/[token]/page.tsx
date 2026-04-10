export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { GrowareLogo } from "@/components/groware-logo";
import { authOptions } from "@/lib/auth-options";
import { getInviteByToken } from "@/actions/org-members/accept-invite.action";
import { AcceptInviteContent } from "./_components/accept-invite-content";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Aceitar convite",
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
        <GrowareLogo size="sm" />

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
