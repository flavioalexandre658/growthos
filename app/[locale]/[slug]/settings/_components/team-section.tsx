"use client";

import { useState } from "react";
import {
  IconUsers,
  IconPlus,
  IconTrash,
  IconMail,
  IconClock,
  IconLoader2,
  IconCheck,
  IconShield,
  IconEye,
  IconCrown,
  IconX,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useOrgMembers } from "@/hooks/queries/use-org-members";
import { useInviteOrgMember } from "@/hooks/mutations/use-invite-org-member";
import { useRemoveOrgMember } from "@/hooks/mutations/use-remove-org-member";
import type { OrgMemberRole } from "@/db/schema/org-member.schema";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const ROLE_LABEL_KEYS: Record<OrgMemberRole, string> = {
  owner: "roleOwner",
  admin: "roleAdmin",
  viewer: "roleViewer",
};

const ROLE_ICONS: Record<OrgMemberRole, React.ReactNode> = {
  owner: <IconCrown size={11} />,
  admin: <IconShield size={11} />,
  viewer: <IconEye size={11} />,
};

const ROLE_COLORS: Record<OrgMemberRole, string> = {
  owner: "text-amber-400 bg-amber-900/20 border-amber-800/30",
  admin: "text-indigo-400 bg-indigo-900/20 border-indigo-800/30",
  viewer: "text-zinc-400 bg-zinc-800/60 border-zinc-700/30",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface InviteFormProps {
  orgId: string;
  onClose: () => void;
}

function InviteForm({ orgId, onClose }: InviteFormProps) {
  const t = useTranslations("settings.team");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const invite = useInviteOrgMember(orgId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t("emailRequiredToast"));
      return;
    }
    const result = await invite.mutateAsync({
      organizationId: orgId,
      email: email.trim(),
      role,
    });
    if (result) {
      toast.success(t("inviteSentToast", { email }));
      setEmail("");
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
            {t("emailLabel")}
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="h-8 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5 min-w-[130px]">
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
            {t("roleLabel")}
          </Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
            className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="viewer">{t("roleViewer")}</option>
            <option value="admin">{t("roleAdmin")}</option>
          </select>
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={invite.isPending}
          className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
        >
          {invite.isPending ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconCheck size={13} />
          )}
          {t("sendInvite")}
        </Button>
      </div>
    </form>
  );
}

interface TeamSectionProps {
  orgId: string;
  currentUserId?: string;
}

export function TeamSection({ orgId, currentUserId }: TeamSectionProps) {
  const t = useTranslations("settings.team");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { data, isLoading } = useOrgMembers(orgId);
  const removeMutation = useRemoveOrgMember(orgId);

  const handleRemove = async (id: string, name: string | null) => {
    await removeMutation.mutateAsync({ id });
    toast.success(t("memberRemovedToast", { name: name ?? t("defaultMemberName") }));
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20">
            <IconUsers size={14} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t("description")}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowInviteForm((v) => !v)}
          className={cn(
            "h-8 gap-1.5 text-xs",
            showInviteForm
              ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
              : "bg-indigo-600 hover:bg-indigo-500 text-white",
          )}
        >
          {showInviteForm ? <IconX size={13} /> : <IconPlus size={13} />}
          {showInviteForm ? t("cancel") : t("invite")}
        </Button>
      </div>

      <div className="p-5 space-y-4">
        {showInviteForm && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-xs font-semibold text-zinc-400 mb-3">
              {t("inviteNewMember")}
            </p>
            <InviteForm
              orgId={orgId}
              onClose={() => setShowInviteForm(false)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-14 w-full rounded-lg bg-zinc-800"
              />
            ))}
          </div>
        ) : (
          <>
            {data?.members && data.members.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
                  {t("membersTitle")} ({data.members.length})
                </p>
                {data.members.map((member) => {
                  const role = member.role as OrgMemberRole;
                  const isCurrentUser = member.userId === currentUserId;
                  const isOwner = role === "owner";
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold shrink-0">
                        {getInitials(member.userName ?? null)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-zinc-200 truncate">
                            {member.userName ?? member.userEmail}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                              {t("you")}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-600 truncate mt-0.5">
                          {member.userEmail}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
                            ROLE_COLORS[role],
                          )}
                        >
                          {ROLE_ICONS[role]}
                          {t(ROLE_LABEL_KEYS[role])}
                        </span>
                        {!isOwner && !isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemove(member.id, member.userName ?? null)
                            }
                            disabled={removeMutation.isPending}
                            className="h-7 w-7 text-zinc-600 hover:text-red-400"
                            title={t("removeMember")}
                          >
                            <IconTrash size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {data?.invites && data.invites.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
                  {t("pendingInvites")} ({data.invites.length})
                </p>
                {data.invites.map((invite) => {
                  const isExpired = new Date() > invite.expiresAt;
                  return (
                    <div
                      key={invite.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3",
                        isExpired
                          ? "border-zinc-800/40 bg-zinc-900/20 opacity-60"
                          : "border-zinc-800 bg-zinc-900/40",
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 shrink-0">
                        <IconMail
                          size={14}
                          className={
                            isExpired ? "text-zinc-700" : "text-zinc-500"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-300 truncate">
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span
                            className={cn(
                              "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
                              ROLE_COLORS[invite.role as OrgMemberRole],
                            )}
                          >
                            {ROLE_ICONS[invite.role as OrgMemberRole]}
                            {t(ROLE_LABEL_KEYS[invite.role as OrgMemberRole])}
                          </span>
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <IconClock size={10} />
                            {isExpired
                              ? t("expired")
                              : t("expiresIn", { time: dayjs(invite.expiresAt).fromNow() })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(!data?.members || data.members.length === 0) &&
              (!data?.invites || data.invites.length === 0) && (
                <p className="text-center py-6 text-zinc-600 text-sm">
                  {t("noMembersOrInvites")}
                </p>
              )}
          </>
        )}
      </div>
    </div>
  );
}
