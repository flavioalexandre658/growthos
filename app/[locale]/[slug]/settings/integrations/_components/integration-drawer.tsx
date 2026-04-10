"use client";

import { useState, useEffect } from "react";
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
  IconExternalLink,
  IconRefresh,
  IconUnlink,
  IconWebhook,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegrationStatusBadge } from "./integration-status-badge";
import { saveWebhookSecret } from "@/actions/integrations/save-webhook-secret.action";
import { useIntegrations, getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";
import { useDisconnectIntegration } from "@/hooks/mutations/use-disconnect-integration";
import { useSyncProgress } from "@/hooks/queries/use-sync-progress";
import dayjs from "@/utils/dayjs";
import { cn } from "@/lib/utils";
import { renderInlineMarkdown } from "@/utils/inline-markdown";
import type { IIntegration } from "@/interfaces/integration.interface";
import type { IntegrationDrawerConfig } from "./integration-types";

interface IntegrationDrawerProps {
  organizationId: string;
  config: IntegrationDrawerConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationDrawer({
  organizationId,
  config,
  open,
  onOpenChange,
}: IntegrationDrawerProps) {
  const { data: integrationsList } = useIntegrations(organizationId);
  const integration = integrationsList?.find((i) => i.provider === config.provider) ?? null;
  const isConnected = !!integration && integration.status !== "disconnected";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 w-full sm:max-w-lg bg-zinc-950 border-l border-zinc-800 overflow-y-auto"
      >
        <DrawerHeader config={config} integration={integration} />
        <SheetDescription className="sr-only">{config.providerName}</SheetDescription>

        <div className="px-5 pb-6 pt-4 space-y-5">
          {isConnected && integration ? (
            <ConnectedDrawerBody
              organizationId={organizationId}
              integration={integration}
              config={config}
              onDisconnected={() => onOpenChange(false)}
            />
          ) : (
            <DisconnectedDrawerBody
              organizationId={organizationId}
              config={config}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerHeader({
  config,
  integration,
}: {
  config: IntegrationDrawerConfig;
  integration: IIntegration | null;
}) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${config.accentColor}18`,
            borderColor: `${config.accentColor}30`,
          }}
        >
          {config.logo}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-base font-semibold text-zinc-100">
              {config.providerName}
            </SheetTitle>
            {integration && integration.status !== "disconnected" && (
              <IntegrationStatusBadge status={integration.status} />
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{config.connectVia}</p>
        </div>
      </div>
    </div>
  );
}

function DisconnectedDrawerBody({
  organizationId,
  config,
}: {
  organizationId: string;
  config: IntegrationDrawerConfig;
}) {
  const tc = useTranslations("settings.integrations.common");
  const tDrawer = useTranslations("settings.integrations.drawer");
  const queryClient = useQueryClient();
  const isMultiField = !!config.credentialFields && config.credentialFields.length > 0;
  const [credential, setCredential] = useState("");
  const [credentialMap, setCredentialMap] = useState<Record<string, string>>({});
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const allMultiFieldsFilled = isMultiField
    ? (config.credentialFields ?? []).every((f) => (credentialMap[f.key] ?? "").trim().length > 0)
    : false;

  const canSubmit = isMultiField ? allMultiFieldsFilled : credential.trim().length > 0;

  const handleConnect = async () => {
    if (isMultiField) {
      if (!allMultiFieldsFilled) return;
      setIsConnecting(true);
      try {
        const trimmed: Record<string, string> = {};
        for (const f of config.credentialFields ?? []) {
          trimmed[f.key] = (credentialMap[f.key] ?? "").trim();
        }
        const result = await config.onConnect(organizationId, trimmed);
        if (result && "error" in result) {
          toast.error(result.error);
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: getIntegrationsQueryKey(organizationId),
        });
        toast.success(config.connectedToast);
        setCredentialMap({});
      } catch (err) {
        toast.error(err instanceof Error ? err.message : config.connectErrorToast);
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    const key = credential.trim();
    if (!key) return;
    setIsConnecting(true);
    try {
      const result = await config.onConnect(organizationId, key);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
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
    <>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setTutorialOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-900/60 transition-colors"
        >
          <span className="uppercase tracking-wider text-[11px] text-zinc-400">
            {tDrawer("tutorialTitle")}
          </span>
          {tutorialOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </button>
        {tutorialOpen && (
          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-800/60">
            <p className="text-xs text-zinc-400 leading-relaxed">{config.howToGetCredential}</p>
            <ol className="space-y-2.5">
              {config.tutorialSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-xs text-zinc-400 leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 flex-1">{renderInlineMarkdown(step)}</span>
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
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
          {tDrawer("credentialsTitle")}
        </h3>
        {isMultiField ? (
          <div className="space-y-3">
            {(config.credentialFields ?? []).map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="text-xs text-zinc-400">{field.label}</label>
                <Input
                  value={credentialMap[field.key] ?? ""}
                  onChange={(e) =>
                    setCredentialMap((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  placeholder={field.placeholder}
                  type={field.type ?? "password"}
                  className="bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs h-9"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">{config.credentialLabel}</label>
            <Input
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder={config.credentialPlaceholder}
              type="password"
              className="bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs h-9"
            />
          </div>
        )}
        <Button
          onClick={handleConnect}
          disabled={!canSubmit || isConnecting}
          style={
            !canSubmit || isConnecting
              ? undefined
              : { backgroundColor: config.accentColor }
          }
          className="w-full h-9 text-white hover:opacity-90"
        >
          {isConnecting ? tc("validating") : tc("connect")}
        </Button>
      </section>
    </>
  );
}

function ConnectedDrawerBody({
  organizationId,
  integration,
  config,
  onDisconnected,
}: {
  organizationId: string;
  integration: IIntegration;
  config: IntegrationDrawerConfig;
  onDisconnected: () => void;
}) {
  const tc = useTranslations("settings.integrations.common");
  const tDrawer = useTranslations("settings.integrations.drawer");
  const queryClient = useQueryClient();
  const { mutateAsync: disconnect, isPending: isDisconnecting } =
    useDisconnectIntegration(organizationId);
  const [activeJobId, setActiveJobId] = useState<string | null>(integration.syncJobId ?? null);
  const [webhookOpen, setWebhookOpen] = useState(!integration.hasWebhookSecret);

  const isSyncing = !!activeJobId;
  const isSyncPending = integration.status === "active" && !integration.historySyncedAt;

  const handleSync = async () => {
    try {
      const result = await config.onSync(organizationId, integration.id);
      setActiveJobId(result.jobId);
      toast.success(tc("syncStarted"), { id: config.toastId });
    } catch {
      toast.error(tc("importErrorToast"), { id: config.toastId });
    }
  };

  const handleSyncCompleted = () => {
    setActiveJobId(null);
    queryClient.invalidateQueries({ queryKey: getIntegrationsQueryKey(organizationId) });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success(tc("syncCompleted"), { id: config.toastId });
  };

  const handleSyncFailed = (reason: string) => {
    setActiveJobId(null);
    queryClient.invalidateQueries({ queryKey: getIntegrationsQueryKey(organizationId) });
    toast.error(reason, { id: config.toastId });
  };

  const handleDisconnect = async () => {
    if (!confirm(config.disconnectConfirm)) return;
    try {
      await disconnect(integration.id);
      toast.success(config.disconnectedToast);
      onDisconnected();
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

  return (
    <>
      <section className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
          {tDrawer("connectionTitle")}
        </h3>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5">
          {integration.providerAccountId && (
            <DetailRow label={tDrawer("providerAccount")}>
              <span className="font-mono text-[11px] text-zinc-300 truncate">
                {integration.providerAccountId}
              </span>
            </DetailRow>
          )}
          <DetailRow label={tDrawer("lastSync")}>
            <span className="text-xs text-zinc-300">{syncedAgo}</span>
          </DetailRow>
          <DetailRow label={tDrawer("history")}>
            <span
              className={cn(
                "text-xs",
                integration.historySyncedAt ? "text-emerald-400" : "text-amber-400",
              )}
            >
              {integration.historySyncedAt ? tc("historyImported") : tc("historyPending")}
            </span>
          </DetailRow>
        </div>

        {integration.status === "error" && integration.syncError && !isSyncing && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3">
            <IconAlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/80 leading-relaxed">{integration.syncError}</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
          {tDrawer("syncTitle")}
        </h3>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing || isDisconnecting}
          className="w-full h-9 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 gap-2"
        >
          <IconRefresh size={13} className={cn(isSyncing && "animate-spin")} />
          {integration.historySyncedAt ? tc("reimport") : tc("importHistory")}
        </Button>

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

        {activeJobId && (
          <SyncProgressBar
            jobId={activeJobId}
            provider={integration.provider}
            onCompleted={handleSyncCompleted}
            onFailed={handleSyncFailed}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
            {tDrawer("webhookTitle")}
          </h3>
          {!webhookOpen && (
            <button
              type="button"
              onClick={() => setWebhookOpen(true)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {tc("configureWebhook")}
            </button>
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
        {!webhookOpen && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              integration.hasWebhookSecret ? "text-emerald-400/80" : "text-amber-400/80",
            )}
          >
            <IconWebhook size={12} />
            <span>
              {integration.hasWebhookSecret ? tc("webhookConfigured") : tc("webhookPending")}
            </span>
          </div>
        )}
      </section>

      <section className="space-y-3 pt-2 border-t border-zinc-800/60">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-red-400/70">
          {tDrawer("dangerTitle")}
        </h3>
        <Button
          variant="outline"
          onClick={handleDisconnect}
          disabled={isDisconnecting || isSyncing}
          className="w-full h-9 text-xs border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 gap-2"
        >
          <IconUnlink size={13} />
          {tc("disconnect")}
        </Button>
      </section>
    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <div className="flex-1 min-w-0 text-right truncate">{children}</div>
    </div>
  );
}

function SyncProgressBar({
  jobId,
  provider,
  onCompleted,
  onFailed,
}: {
  jobId: string;
  provider: string;
  onCompleted: () => void;
  onFailed: (reason: string) => void;
}) {
  const tc = useTranslations("settings.integrations.common");
  const { data } = useSyncProgress(jobId);

  const phaseLabels: Record<string, string> = {
    deleting: tc("syncPhaseDeleting"),
    fetching: tc("syncPhaseFetching"),
    processing: tc("syncPhaseProcessing"),
    finalizing: tc("syncPhaseFinalizing"),
    completed: tc("syncPhaseCompleted"),
    error: tc("syncPhaseError"),
  };

  useEffect(() => {
    if (data?.state === "completed" || data?.state === "not_found") onCompleted();
    if (data?.state === "failed") onFailed(data.failedReason ?? tc("syncFailed"));
  }, [data?.state, data?.failedReason, onCompleted, onFailed, tc]);

  const isWaiting = !data || data.state === "waiting" || data.state === "delayed";
  const progress = data?.progress;
  const pct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : undefined;

  const isIndeterminate = isWaiting || progress?.phase === "fetching" || progress?.phase === "deleting";
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

  const phaseLabel = isWaiting
    ? tc("syncQueueWaiting", { provider: providerLabel })
    : (progress ? (phaseLabels[progress.phase] ?? progress.phase) : tc("syncPhaseFetching"));

  const message = (!isWaiting && progress?.message) ? progress.message : "";

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isWaiting ? "bg-zinc-500" : "bg-blue-400",
            )} />
            <span className={cn(
              "relative inline-flex rounded-full h-1.5 w-1.5",
              isWaiting ? "bg-zinc-400" : "bg-blue-400",
            )} />
          </span>
          <span className="text-xs font-medium text-zinc-300 truncate">{phaseLabel}</span>
        </div>
        {pct !== undefined && (
          <span className="text-[11px] tabular-nums text-zinc-400 shrink-0">{pct}%</span>
        )}
      </div>

      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-zinc-700/60">
        {isIndeterminate ? (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-zinc-400/60 to-transparent animate-shimmer bg-[length:200%_100%]" />
        ) : (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${pct ?? 0}%` }}
          />
        )}
      </div>

      {message && (
        <p className="text-[11px] text-zinc-500 truncate leading-none">{message}</p>
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
  config: IntegrationDrawerConfig;
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
      {hasWebhookSecret && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {tc("webhookConfigured")}
        </div>
      )}

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
      <div className="flex-1 min-w-0 overflow-hidden pt-0.5">{text ? renderInlineMarkdown(text) : children}</div>
    </div>
  );
}
