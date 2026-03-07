"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheckFilled,
  IconClockHour4,
  IconCopy,
  IconCheck,
  IconDots,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
  IconUnlink,
  IconWebhook,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IntegrationStatusBadge } from "./integration-status-badge";
import { saveWebhookSecret } from "@/actions/integrations/save-webhook-secret.action";
import { useIntegrations } from "@/hooks/queries/use-integrations";
import { useDisconnectIntegration } from "@/hooks/mutations/use-disconnect-integration";
import { useQueryClient } from "@tanstack/react-query";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";
import toast from "react-hot-toast";
import dayjs from "@/utils/dayjs";
import { cn } from "@/lib/utils";
import type { IIntegration, IntegrationProvider } from "@/interfaces/integration.interface";

type SyncResult = Record<string, number>;

interface IntegrationCardConfig {
  provider: IntegrationProvider;
  providerName: string;
  accentColor: string;
  logo: React.ReactNode;
  credentialLabel: string;
  credentialPlaceholder: string;
  connectVia: string;
  howToGetCredential: string;
  tutorialSteps: string[];
  dashboardUrl: string;
  openDashboardLabel: string;
  webhookEvents: string[];
  webhookStep1: string;
  webhookStep2: string;
  webhookStep3: string;
  webhookSecretPlaceholder: string;
  webhookWarning: string;
  toastId: string;
  disconnectConfirm: string;
  importingToast: string;
  importSuccessToast: (result: SyncResult) => string;
  connectedToast: string;
  connectErrorToast: string;
  disconnectedToast: string;
  onConnect: (organizationId: string, credential: string) => Promise<IIntegration>;
  onSync: (organizationId: string, integrationId: string) => Promise<SyncResult>;
}

interface IntegrationCardProps {
  organizationId: string;
  config: IntegrationCardConfig;
}

export function IntegrationCard({ organizationId, config }: IntegrationCardProps) {
  const { data: integrationsList, isLoading } = useIntegrations(organizationId);
  const integration = integrationsList?.find((i) => i.provider === config.provider) ?? null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-2.5 w-32 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!integration || integration.status === "disconnected") {
    return <DisconnectedCard organizationId={organizationId} config={config} />;
  }

  return <ConnectedCard organizationId={organizationId} integration={integration} config={config} />;
}

function DisconnectedCard({
  organizationId,
  config,
}: {
  organizationId: string;
  config: IntegrationCardConfig;
}) {
  const tc = useTranslations("settings.integrations.common");
  const queryClient = useQueryClient();
  const [credential, setCredential] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    const key = credential.trim();
    if (!key) return;
    setIsConnecting(true);
    try {
      await config.onConnect(organizationId, key);
      await queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
      toast.success(config.connectedToast);
      setCredential("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : config.connectErrorToast);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <ProviderLogo config={config} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">{config.providerName}</p>
          <p className="text-xs text-zinc-500">{config.connectVia}</p>
        </div>
        <IntegrationStatusBadge status="disconnected" />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-400">{config.credentialLabel}</label>
        <div className="flex gap-2">
          <Input
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            placeholder={config.credentialPlaceholder}
            type="password"
            className="flex-1 bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs h-9"
          />
          <Button
            onClick={handleConnect}
            disabled={!credential.trim() || isConnecting}
            style={{ backgroundColor: config.accentColor }}
            className="shrink-0 h-9 text-white hover:opacity-90"
          >
            {isConnecting ? tc("validating") : tc("connect")}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setTutorialOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50 transition-colors"
        >
          <span>{config.howToGetCredential}</span>
          {tutorialOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
        </button>
        {tutorialOpen && (
          <div className="px-3 pb-4 pt-1 space-y-3 border-t border-zinc-800">
            <ol className="space-y-2.5">
              {config.tutorialSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-xs text-zinc-400">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 flex-1">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href={config.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs transition-colors mt-1"
              style={{ color: config.accentColor }}
            >
              <IconExternalLink size={12} />
              {config.openDashboardLabel}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectedCard({
  organizationId,
  integration,
  config,
}: {
  organizationId: string;
  integration: IIntegration;
  config: IntegrationCardConfig;
}) {
  const tc = useTranslations("settings.integrations.common");
  const queryClient = useQueryClient();
  const { mutateAsync: disconnect, isPending: isDisconnecting } =
    useDisconnectIntegration(organizationId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(!integration.hasWebhookSecret);

  const isSyncPending = integration.status === "active" && !integration.historySyncedAt;

  const handleSync = async () => {
    toast.loading(config.importingToast, { id: config.toastId });
    setIsSyncing(true);
    try {
      const result = await config.onSync(organizationId, integration.id);
      queryClient.invalidateQueries({ queryKey: getIntegrationsQueryKey(organizationId) });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(config.importSuccessToast(result), { id: config.toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : tc("importErrorToast"),
        { id: config.toastId },
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(config.disconnectConfirm)) return;
    try {
      await disconnect(integration.id);
      toast.success(config.disconnectedToast);
    } catch {
      toast.error(tc("disconnectErrorToast"));
    }
  };

  const handleSecretSaved = () => {
    queryClient.invalidateQueries({ queryKey: getIntegrationsQueryKey(organizationId) });
    setWebhookOpen(false);
  };

  const syncedAgo = integration.lastSyncedAt
    ? dayjs(integration.lastSyncedAt).fromNow()
    : tc("historyNever");

  const historyStatus = integration.historySyncedAt
    ? tc("historyImported")
    : tc("historyPending");

  const webhookStatus = integration.hasWebhookSecret
    ? tc("webhookConfigured")
    : tc("webhookPending");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <ProviderLogo config={config} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-zinc-200">{config.providerName}</p>
              <IntegrationStatusBadge status={integration.status} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {integration.providerAccountId && (
                <>
                  <span className="text-[11px] text-zinc-600 font-mono truncate max-w-[120px]">
                    {integration.providerAccountId}
                  </span>
                  <span className="text-zinc-700 text-[10px]">·</span>
                </>
              )}
              <span className="text-[11px] text-zinc-600">{syncedAgo}</span>
              <span className="text-zinc-700 text-[10px]">·</span>
              <span
                className={cn(
                  "text-[11px]",
                  integration.historySyncedAt ? "text-emerald-500" : "text-zinc-600",
                )}
              >
                {historyStatus}
              </span>
              <span className="text-zinc-700 text-[10px]">·</span>
              <span
                className={cn(
                  "text-[11px]",
                  integration.hasWebhookSecret ? "text-emerald-500" : "text-amber-500",
                )}
              >
                {webhookStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isSyncing && (
              <IconLoader2 size={14} className="animate-spin text-zinc-500" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || isDisconnecting}
              className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 gap-1.5"
            >
              <IconRefresh size={12} className={cn(isSyncing && "animate-spin")} />
              {integration.historySyncedAt ? tc("reimport") : tc("importHistory")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                >
                  <IconDots size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setWebhookOpen((o) => !o)}
                  className="gap-2 cursor-pointer"
                >
                  <IconWebhook size={14} />
                  {tc("configureWebhook")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  disabled={isDisconnecting || isSyncing}
                  className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
                >
                  <IconUnlink size={14} />
                  {tc("disconnect")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {integration.status === "error" && integration.syncError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3">
            <IconAlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/80 leading-relaxed">{integration.syncError}</p>
          </div>
        )}

        {!isSyncing && isSyncPending && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
            <IconClockHour4 size={12} />
            <span>{tc("historyNotImported")}</span>
          </div>
        )}
        {!isSyncing && integration.historySyncedAt && !isSyncPending && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/80">
            <IconCircleCheckFilled size={12} />
            <span>{tc("historyImportedStatus")}</span>
          </div>
        )}
      </div>

      {webhookOpen && (
        <WebhookSection
          organizationId={organizationId}
          integrationId={integration.id}
          hasWebhookSecret={integration.hasWebhookSecret}
          config={config}
          onSecretSaved={handleSecretSaved}
          accentColor={config.accentColor}
        />
      )}
    </div>
  );
}

function WebhookSection({
  organizationId,
  integrationId,
  hasWebhookSecret,
  config,
  onSecretSaved,
  accentColor,
}: {
  organizationId: string;
  integrationId: string;
  hasWebhookSecret: boolean;
  config: IntegrationCardConfig;
  onSecretSaved: () => void;
  accentColor: string;
}) {
  const tc = useTranslations("settings.integrations.common");
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/${config.provider}/${integrationId}`
      : `/api/webhooks/${config.provider}/${integrationId}`;

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [secret, setSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveSecret = async () => {
    if (!secret.trim()) return;
    setIsSaving(true);
    try {
      await saveWebhookSecret(organizationId, integrationId, secret.trim());
      toast.success(tc("webhookSuccessToast"));
      setSecret("");
      onSecretSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("webhookErrorToast"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <IconWebhook size={14} style={{ color: accentColor }} className="shrink-0" />
        <p className="text-xs font-medium text-zinc-300">{tc("configureWebhook")}</p>
        {hasWebhookSecret && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {tc("webhookConfigured")}
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs text-zinc-400">
        <WebhookStep n={1} text={config.webhookStep1} />
        <WebhookStep n={2}>
          <span>{tc("webhookStepPasteUrl")}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <code className="min-w-0 flex-1 block bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 font-mono text-[11px] overflow-hidden text-ellipsis whitespace-nowrap">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="shrink-0 h-8 px-2.5 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              {copiedUrl ? <IconCheck size={12} /> : <IconCopy size={12} />}
            </Button>
          </div>
        </WebhookStep>
        <WebhookStep n={3}>
          <span>{tc("webhookStepSelectEvents")}</span>
          <ul className="mt-1.5 space-y-0.5 font-mono text-zinc-600">
            {config.webhookEvents.map((e) => (
              <li key={e} className="flex items-center gap-2 overflow-hidden">
                <span className="w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
                <span className="truncate text-[11px]">{e}</span>
              </li>
            ))}
          </ul>
        </WebhookStep>
        <WebhookStep n={4} text={config.webhookStep3} />
        <WebhookStep n={5}>
          <span>{tc("webhookStepPasteSecret")}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={config.webhookSecretPlaceholder}
              className="flex-1 h-8 bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs"
            />
            <Button
              size="sm"
              onClick={handleSaveSecret}
              disabled={!secret.trim() || isSaving}
              style={!secret.trim() || isSaving ? undefined : { backgroundColor: accentColor }}
              className="shrink-0 h-8 text-white"
            >
              {isSaving ? tc("webhookSaving") : tc("webhookSave")}
            </Button>
          </div>
        </WebhookStep>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
        <IconAlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 leading-relaxed">{config.webhookWarning}</p>
      </div>
    </div>
  );
}

function WebhookStep({
  n,
  text,
  children,
}: {
  n: number;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 min-w-0">
      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">
        {n}
      </span>
      <div className="flex-1 min-w-0 overflow-hidden pt-0.5">{text ?? children}</div>
    </div>
  );
}

function ProviderLogo({ config }: { config: IntegrationCardConfig }) {
  return (
    <div
      className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
      style={{
        backgroundColor: `${config.accentColor}18`,
        borderColor: `${config.accentColor}30`,
      }}
    >
      {config.logo}
    </div>
  );
}
