"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  IconLoader2,
  IconBuilding,
  IconShield,
  IconEye,
  IconArrowRight,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/actions/org-members/accept-invite.action";

interface AcceptInviteContentProps {
  token: string;
  invite: {
    email: string;
    role: string;
    orgName: string;
    orgSlug: string;
    expiresAt: Date;
  } | null;
  isLoggedIn: boolean;
  userEmail?: string;
}

const ROLE_CONFIG = {
  admin: {
    icon: <IconShield size={14} />,
    label: "Admin",
    color: "text-indigo-400 bg-indigo-900/20 border-indigo-800/30",
  },
  viewer: {
    icon: <IconEye size={14} />,
    label: "Visualizador",
    color: "text-zinc-400 bg-zinc-800/60 border-zinc-700/30",
  },
};

export function AcceptInviteContent({
  token,
  invite,
  isLoggedIn,
  userEmail,
}: AcceptInviteContentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (!invite) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20">
            <IconAlertTriangle size={24} className="text-red-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-100">
            Convite inválido ou expirado
          </h3>
          <p className="text-sm text-zinc-500">
            Este link de convite não é mais válido. Peça ao administrador do
            workspace que envie um novo convite.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Ir para o login
          <IconArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const isExpired = invite.expiresAt < new Date();
  const roleConfig =
    ROLE_CONFIG[(invite.role as keyof typeof ROLE_CONFIG) ?? "viewer"];

  if (isExpired) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600/20">
            <IconAlertTriangle size={24} className="text-amber-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-100">
            Convite expirado
          </h3>
          <p className="text-sm text-zinc-500">
            Este convite expirou. Solicite um novo ao administrador do workspace.
          </p>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    setIsLoading(true);
    const result = await acceptInvite({ token }).catch((err: Error) => {
      toast.error(err.message ?? "Erro ao aceitar convite.");
      setIsLoading(false);
      return null;
    });

    if (result?.success) {
      toast.success(`Bem-vindo ao ${invite.orgName}!`);
      router.push(`/${result.slug}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 shrink-0">
            <IconBuilding size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">
              Workspace
            </p>
            <p className="text-base font-bold text-zinc-100">{invite.orgName}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border ${roleConfig.color}`}
              >
                {roleConfig.icon}
                {roleConfig.label}
              </span>
              <span className="text-xs text-zinc-600">
                Convite para: {invite.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isLoggedIn && userEmail?.toLowerCase() !== invite.email.toLowerCase() && (
        <div className="rounded-lg border border-amber-800/30 bg-amber-900/10 p-4">
          <p className="text-xs text-amber-400 font-medium">
            Este convite foi enviado para{" "}
            <strong>{invite.email}</strong>, mas você está logado com{" "}
            <strong>{userEmail}</strong>. Faça login com a conta correta para
            aceitar.
          </p>
        </div>
      )}

      {isLoggedIn ? (
        <Button
          onClick={handleAccept}
          disabled={
            isLoading ||
            userEmail?.toLowerCase() !== invite.email.toLowerCase()
          }
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold group"
        >
          {isLoading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Aceitando...
            </>
          ) : (
            <>
              Aceitar convite
              <IconArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          <Link
            href={`/login?callbackUrl=/invite/${token}`}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
          >
            Fazer login para aceitar
            <IconArrowRight size={16} />
          </Link>
          <Link
            href={`/register?callbackUrl=/invite/${token}&email=${encodeURIComponent(invite.email)}`}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-lg border border-zinc-700 hover:border-zinc-600 bg-zinc-900/50 text-zinc-300 font-medium text-sm transition-colors"
          >
            Criar conta nova
          </Link>
        </div>
      )}
    </div>
  );
}
