"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "@/i18n/routing";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import { growareReset } from "@/utils/groware";
import {
  IconBell,
  IconBellOff,
  IconHelp,
  IconSettings,
  IconLogout,
  IconShoppingCart,
  IconRefresh,
  IconArrowBack,
  IconAlertTriangle,
  IconTrophy,
  IconMail,
  IconFileAnalytics,
  IconBulb,
  IconX,
  IconRefreshDot,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { SensitiveToggle } from "@/components/ui/sensitive-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganization } from "@/components/providers/organization-provider";
import { useNotifications } from "@/hooks/queries/use-notifications";
import { useUnreadNotificationCount } from "@/hooks/queries/use-unread-notification-count";
import { useMarkNotificationRead } from "@/hooks/mutations/use-mark-notification-read";
import { useMarkAllNotificationsRead } from "@/hooks/mutations/use-mark-all-notifications-read";
import type { NotificationRow } from "@/hooks/queries/use-notifications";
import type { NotificationType } from "@/db/schema/notification.schema";

dayjs.extend(relativeTime);

interface TopbarProps {
  slug: string;
}

function TopbarIconButton({
  children,
  tooltip,
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip: string;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300",
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="z-[60] text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function notificationIcon(type: NotificationType) {
  const cls = "shrink-0";
  switch (type) {
    case "purchase":
      return <IconShoppingCart size={14} className={cn(cls, "text-emerald-400")} />;
    case "renewal":
      return <IconRefresh size={14} className={cn(cls, "text-indigo-400")} />;
    case "refund":
      return <IconArrowBack size={14} className={cn(cls, "text-rose-400")} />;
    case "alert_no_events":
    case "alert_churn_rate":
    case "alert_revenue_drop":
      return <IconAlertTriangle size={14} className={cn(cls, "text-amber-400")} />;
    case "milestone":
      return <IconTrophy size={14} className={cn(cls, "text-yellow-400")} />;
    case "email_sequence":
      return <IconMail size={14} className={cn(cls, "text-sky-400")} />;
    case "weekly_digest":
      return <IconFileAnalytics size={14} className={cn(cls, "text-violet-400")} />;
    case "recommendation":
      return <IconBulb size={14} className={cn(cls, "text-orange-400")} />;
    case "sync":
      return <IconRefreshDot size={14} className={cn(cls, "text-blue-400")} />;
  }
}

const SALE_NOTIFICATION_TYPES = new Set<NotificationType>(["purchase", "renewal", "refund"]);

function NotificationItem({
  notification,
  onRead,
  onEmailClick,
}: {
  notification: NotificationRow;
  onRead: (notification: NotificationRow) => void;
  onEmailClick: (notification: NotificationRow) => void;
}) {
  const hasEmailHtml = notification.type === "email_sequence" &&
    (notification.metadata as Record<string, unknown> | null)?.emailHtml;

  return (
    <button
      onClick={() => {
        if (hasEmailHtml) {
          onEmailClick(notification);
        } else {
          onRead(notification);
        }
      }}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/60",
        !notification.isRead && "bg-zinc-900/30",
      )}
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800/80">
        {notificationIcon(notification.type)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-xs leading-snug",
            notification.isRead ? "text-zinc-400" : "font-medium text-zinc-200",
          )}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
          )}
        </div>
        {notification.body && (
          <p className="mt-0.5 text-[11px] text-zinc-500 truncate">{notification.body}</p>
        )}
        <p className="mt-1 text-[10px] text-zinc-600">
          {dayjs(notification.createdAt).fromNow()}
        </p>
      </div>
    </button>
  );
}

function EmailPreviewDialog({
  notification,
  open,
  onClose,
}: {
  notification: NotificationRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("topbar.notifications.emailModal");
  const metadata = notification?.metadata as Record<string, unknown> | null;
  const emailHtml = (metadata?.emailHtml as string) ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col gap-0 border-zinc-800 bg-zinc-950 p-0 overflow-hidden [&>button]:hidden">
        <DialogHeader className="shrink-0 border-b border-zinc-800/60 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-semibold text-zinc-200 leading-snug">
                {notification?.title}
              </DialogTitle>
              {notification?.body && (
                <p className="mt-1 text-xs text-zinc-500">
                  {t("sentTo")}: {notification.body}
                </p>
              )}
              <p className="mt-1 text-[10px] text-zinc-600">
                {notification ? dayjs(notification.createdAt).fromNow() : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <IconX size={16} />
            </button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {emailHtml ? (
            <iframe
              srcDoc={emailHtml}
              sandbox="allow-same-origin"
              className="h-full w-full border-0"
              title={notification?.title ?? "Email"}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-600">{t("noContent")}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NotificationsPopover() {
  const t = useTranslations("topbar.notifications");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const router = useRouter();
  const [emailNotification, setEmailNotification] = useState<NotificationRow | null>(null);

  const { data: notifications = [], isLoading } = useNotifications(orgId);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(orgId);
  const { mutate: markRead } = useMarkNotificationRead(orgId ?? "");
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllNotificationsRead(orgId ?? "");

  function handleRead(notification: NotificationRow) {
    markRead({ id: notification.id });
    const metadata = notification.metadata as Record<string, unknown> | null;
    if (SALE_NOTIFICATION_TYPES.has(notification.type) && metadata?.customerId && organization?.slug) {
      router.push(`/${organization.slug}/customers/${metadata.customerId}` as Parameters<typeof router.push>[0]);
    } else if (notification.linkUrl) {
      router.push(notification.linkUrl as Parameters<typeof router.push>[0]);
    }
  }

  function handleEmailClick(notification: NotificationRow) {
    markRead({ id: notification.id });
    setEmailNotification(notification);
  }

  function handleMarkAll() {
    if (!orgId) return;
    markAllRead({ organizationId: orgId });
  }

  return (
    <>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800/70 hover:text-zinc-300">
                <IconBell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-indigo-500 ring-1 ring-zinc-950" />
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[60] text-xs bg-zinc-800 border-zinc-700 text-zinc-200">
            {t("title")}
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-80 rounded-xl border-zinc-800 bg-zinc-950 p-0 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-zinc-200">{t("title")}</h4>
              {unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500/20 px-1 text-[10px] font-bold text-indigo-400 ring-1 ring-indigo-500/30">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-zinc-800/40">
            {isLoading ? (
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-800 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-zinc-800 animate-pulse" />
                      <div className="h-2.5 w-1/2 rounded bg-zinc-800/60 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
                  <IconBellOff size={18} className="text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-600">{t("empty")}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={handleRead}
                  onEmailClick={handleEmailClick}
                />
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <EmailPreviewDialog
        notification={emailNotification}
        open={!!emailNotification}
        onClose={() => setEmailNotification(null)}
      />
    </>
  );
}

function UserMenu() {
  const t = useTranslations("topbar.userMenu");
  const { data: session } = useSession();
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-xs font-bold text-zinc-300 ring-1 ring-zinc-700/50 transition-colors hover:bg-zinc-800 hover:ring-zinc-600">
              {initials}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          collisionPadding={8}
          className="z-[60] text-xs max-w-[180px] truncate bg-zinc-800 border-zinc-700 text-zinc-200"
        >
          {userName ?? userEmail ?? ""}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-xl border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <DropdownMenuLabel className="px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            {t("loggedAs")}
          </p>
          {userName && (
            <p className="text-sm font-medium text-zinc-200 truncate mt-0.5">{userName}</p>
          )}
          {userEmail && (
            <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800/60" />
        <DropdownMenuItem
          onClick={() => {
            growareReset();
            signOut({ callbackUrl: "/login" });
          }}
          className="gap-2 px-3 py-2 text-zinc-400 focus:bg-zinc-900 focus:text-red-400 cursor-pointer"
        >
          <IconLogout size={15} />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({ slug }: TopbarProps) {
  const t = useTranslations("topbar");

  return (
    <TooltipProvider delayDuration={150}>
      <div className="sticky top-0 z-40 hidden md:flex items-center justify-end gap-1 h-14 px-4 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
        <SensitiveToggle />
        <NotificationsPopover />
        <Link href="/docs" className="contents">
          <TopbarIconButton tooltip={t("help")}>
            <IconHelp size={16} />
          </TopbarIconButton>
        </Link>
        <Link href={`/${slug}/settings/organization`} className="contents">
          <TopbarIconButton tooltip={t("settings")}>
            <IconSettings size={16} />
          </TopbarIconButton>
        </Link>
        <div className="mx-1 h-5 w-px bg-zinc-800/80" />
        <UserMenu />
      </div>
    </TooltipProvider>
  );
}

export function MobileTopbarActions() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-0.5">
        <SensitiveToggle />
        <NotificationsPopover />
        <UserMenu />
      </div>
    </TooltipProvider>
  );
}
