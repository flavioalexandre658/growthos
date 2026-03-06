"use client";

import { useState } from "react";
import {
  IconBrandStripe,
  IconRefresh,
  IconUnlink,
  IconAlertCircle,
  IconClockHour4,
  IconCircleCheckFilled,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconLoader2,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegrationStatusBadge } from "./integration-status-badge";
import { WebhookInstructions } from "./webhook-instructions";
import { useConnectStripe } from "@/hooks/mutations/use-connect-stripe";
import { useSyncStripeHistory } from "@/hooks/mutations/use-sync-stripe-history";
import { useDisconnectIntegration } from "@/hooks/mutations/use-disconnect-integration";
import { useIntegrations } from "@/hooks/queries/use-integrations";
import { useQueryClient } from "@tanstack/react-query";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";
import toast from "react-hot-toast";
import dayjs from "@/utils/dayjs";
import { cn } from "@/lib/utils";
import type { IIntegration } from "@/interfaces/integration.interface";

const PERMISSIONS = [
  "Customers — Read",
  "Subscriptions — Read",
  "Invoices — Read",
  "Charges — Read",
  "Balance transactions — Read",
];

interface StripeConnectCardProps {
  organizationId: string;
}

export function StripeConnectCard({ organizationId }: StripeConnectCardProps) {
  const { data: integrationsList, isLoading } = useIntegrations(organizationId);
  const integration = integrationsList?.find((i) => i.provider === "stripe") ?? null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 animate-pulse">
        <div className="h-5 w-32 bg-zinc-800 rounded mb-4" />
        <div className="h-9 w-full bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!integration || integration.status === "disconnected") {
    return <ConnectForm organizationId={organizationId} />;
  }

  return <ConnectedCard organizationId={organizationId} integration={integration} />;
}

// ─── Connect Form ─────────────────────────────────────────────────────────────

function ConnectForm({ organizationId }: { organizationId: string }) {
  const [rawKey, setRawKey] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const { mutateAsync, isPending } = useConnectStripe(organizationId);

  const handleConnect = async () => {
    const key = rawKey.trim();
    if (!key) return;
    try {
      await mutateAsync(key);
      toast.success("Stripe conectado! Inicie a importação do histórico.");
      setRawKey("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar o Stripe.");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#635BFF]/10 border border-[#635BFF]/20 flex items-center justify-center shrink-0">
          <IconBrandStripe size={18} className="text-[#635BFF]" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">Stripe</p>
          <p className="text-xs text-zinc-500">Conecte via Restricted Key (somente leitura)</p>
        </div>
        <IntegrationStatusBadge status="disconnected" />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Restricted Key</label>
        <div className="flex gap-2">
          <Input
            value={rawKey}
            onChange={(e) => setRawKey(e.target.value)}
            placeholder="rk_live_..."
            type="password"
            className="flex-1 bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs h-9"
          />
          <Button
            onClick={handleConnect}
            disabled={!rawKey.trim() || isPending}
            className="shrink-0 h-9 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isPending ? "Validando..." : "Conectar"}
          </Button>
        </div>
      </div>

      <RestrictedKeyTutorial open={tutorialOpen} onToggle={() => setTutorialOpen((o) => !o)} />
    </div>
  );
}

// ─── Tutorial colapsável ──────────────────────────────────────────────────────

function RestrictedKeyTutorial({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50 transition-colors"
      >
        <span>Como criar sua Restricted Key</span>
        {open ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
      </button>

      {open && (
        <div className="px-3 pb-4 pt-1 space-y-3 border-t border-zinc-800">
          <ol className="space-y-2.5">
            {[
              <>
                Acesse{" "}
                <span className="font-medium text-zinc-300">dashboard.stripe.com</span>
              </>,
              <>
                Navegue até{" "}
                <span className="font-medium text-zinc-300">
                  Developers → API Keys → Restricted Keys
                </span>
              </>,
              <>
                Clique em{" "}
                <span className="font-medium text-zinc-300">Create restricted key</span>
              </>,
              <>
                Na lista de permissões, marque{" "}
                <span className="font-medium text-zinc-300">Read</span> em:
                <ul className="mt-1.5 space-y-1 pl-1">
                  {PERMISSIONS.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-zinc-500">
                      <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </>,
              <>
                Clique em{" "}
                <span className="font-medium text-zinc-300">Create key</span>
                {", "}
                copie e cole no campo acima
              </>,
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-xs text-zinc-400">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">
                  {i + 1}
                </span>
                <span className="pt-0.5 flex-1">{step}</span>
              </li>
            ))}
          </ol>

          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
          >
            <IconExternalLink size={12} />
            Abrir Stripe Dashboard
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Connected Card ───────────────────────────────────────────────────────────

function ConnectedCard({
  organizationId,
  integration,
}: {
  organizationId: string;
  integration: IIntegration;
}) {
  const queryClient = useQueryClient();
  const { mutate: syncHistory, isPending: isSyncing } = useSyncStripeHistory(organizationId);
  const { mutateAsync: disconnect, isPending: isDisconnecting } =
    useDisconnectIntegration(organizationId);

  const isSyncPending = integration.status === "active" && !integration.historySyncedAt;

  const handleSync = () => {
    toast.loading("Importando histórico em segundo plano...", { id: "stripe-sync" });
    syncHistory(integration.id, {
      onSuccess: (result) => {
        toast.success(
          `Histórico importado: ${result.subscriptionsSynced} assinaturas, ${result.invoicesSynced} recorrentes, ${result.oneTimePurchasesSynced} avulsos.`,
          { id: "stripe-sync" },
        );
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Erro ao importar histórico.",
          { id: "stripe-sync" },
        );
      },
    });
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar o Stripe? Os dados já importados serão mantidos.")) return;
    try {
      await disconnect(integration.id);
      toast.success("Stripe desconectado.");
    } catch {
      toast.error("Erro ao desconectar.");
    }
  };

  const handleSecretSaved = () => {
    queryClient.invalidateQueries({ queryKey: getIntegrationsQueryKey(organizationId) });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#635BFF]/10 border border-[#635BFF]/20 flex items-center justify-center shrink-0">
            <IconBrandStripe size={18} className="text-[#635BFF]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200">Stripe</p>
            {integration.providerAccountId && (
              <p className="text-xs text-zinc-500 font-mono truncate">
                {integration.providerAccountId}
              </p>
            )}
          </div>
          <IntegrationStatusBadge status={integration.status} />
        </div>

        {integration.status === "error" && integration.syncError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/20 p-3">
            <IconAlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/80">{integration.syncError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <SyncStat
            label="Último sync"
            value={integration.lastSyncedAt ? dayjs(integration.lastSyncedAt).fromNow() : "Nunca"}
          />
          <SyncStat
            label="Histórico"
            value={integration.historySyncedAt ? "Importado" : "Pendente"}
            highlight={!!integration.historySyncedAt}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
          {isSyncing && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-400">
              <IconLoader2 size={13} className="animate-spin shrink-0" />
              <span>Importando em segundo plano...</span>
            </div>
          )}
          {!isSyncing && isSyncPending && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <IconClockHour4 size={13} />
              <span>Histórico não importado ainda</span>
            </div>
          )}
          {!isSyncing && integration.historySyncedAt && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <IconCircleCheckFilled size={13} />
              <span>Histórico importado</span>
            </div>
          )}

          <div className="sm:ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
            >
              <IconRefresh size={12} className={cn(isSyncing && "animate-spin")} />
              {integration.historySyncedAt ? "Re-importar" : "Importar histórico"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting || isSyncing}
              className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              <IconUnlink size={12} />
              Desconectar
            </Button>
          </div>
        </div>
      </div>

      <WebhookInstructions
        organizationId={organizationId}
        integrationId={integration.id}
        hasWebhookSecret={integration.hasWebhookSecret}
        onSecretSaved={handleSecretSaved}
      />

      <StripeConnectedNotice />
    </div>
  );
}

// ─── Connected Notice ─────────────────────────────────────────────────────────

function StripeConnectedNotice() {
  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <IconInfoCircle size={15} className="text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-xs font-medium text-indigo-300">
            Pagamentos e assinaturas chegam automaticamente via webhook.
          </p>
          <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2">
            <p className="text-xs text-amber-300/90 leading-relaxed">
              <span className="font-medium">Atenção:</span> Se você usa o tracker.js, não dispare
              mais eventos de{" "}
              <code className="font-mono text-amber-200 bg-amber-500/10 px-1 rounded">purchase</code>{" "}
              do Stripe manualmente — isso duplicaria os dados no dashboard.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide">
              O tracker.js continua necessário para:
            </p>
            <ul className="space-y-1">
              {[
                "Pageviews e navegação do site",
                "Cadastros e eventos do funil",
                "Pagamentos de outros gateways (Asaas, Kiwify...)",
                "Contexto de aquisição (UTMs, landing pages)",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SyncStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium">{label}</p>
      <p
        className={cn(
          "text-xs mt-0.5",
          highlight ? "text-emerald-400 font-medium" : "text-zinc-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}
