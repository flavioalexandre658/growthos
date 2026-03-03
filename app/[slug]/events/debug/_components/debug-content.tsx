"use client";

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { debugUrl } from "@/actions/events/debug-url.action";
import { checkEvents } from "@/actions/dashboard/check-events.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import {
  IconBug,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconLoader2,
  IconSearch,
  IconCode,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconActivity,
  IconExternalLink,
  IconKey,
  IconWorld,
  IconShieldCheck,
  IconClock,
} from "@tabler/icons-react";
import type { IDebugResult } from "@/interfaces/event.interface";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

type CheckStatus = "ok" | "error" | "warning" | "pending" | "idle";

interface CheckItem {
  label: string;
  detail?: string;
  status: CheckStatus;
  icon: React.ElementType;
}

function CheckRow({ item }: { item: CheckItem }) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full shrink-0 mt-0.5",
          item.status === "ok" && "bg-emerald-600/20",
          item.status === "error" && "bg-red-600/20",
          item.status === "warning" && "bg-amber-600/20",
          item.status === "pending" && "bg-zinc-800",
          item.status === "idle" && "bg-zinc-800/60"
        )}
      >
        {item.status === "pending" ? (
          <IconLoader2 size={12} className="animate-spin text-zinc-400" />
        ) : (
          <Icon
            size={12}
            className={cn(
              item.status === "ok" && "text-emerald-400",
              item.status === "error" && "text-red-400",
              item.status === "warning" && "text-amber-400",
              item.status === "idle" && "text-zinc-600"
            )}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            item.status === "ok" && "text-zinc-200",
            item.status === "error" && "text-red-300",
            item.status === "warning" && "text-amber-300",
            item.status === "idle" && "text-zinc-600",
            item.status === "pending" && "text-zinc-400"
          )}
        >
          {item.label}
        </p>
        {item.detail && (
          <p
            className={cn(
              "text-xs mt-0.5 font-mono break-all",
              item.status === "ok" && "text-zinc-500",
              item.status === "error" && "text-red-500/80",
              item.status === "warning" && "text-amber-500/80",
              item.status === "idle" && "text-zinc-700"
            )}
          >
            {item.detail}
          </p>
        )}
      </div>
      <div className="shrink-0">
        {item.status === "ok" && (
          <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-950/40 border border-emerald-800/30 rounded px-1.5 py-0.5">
            OK
          </span>
        )}
        {item.status === "error" && (
          <span className="text-[10px] font-semibold text-red-500 bg-red-950/40 border border-red-800/30 rounded px-1.5 py-0.5">
            ERRO
          </span>
        )}
        {item.status === "warning" && (
          <span className="text-[10px] font-semibold text-amber-500 bg-amber-950/40 border border-amber-800/30 rounded px-1.5 py-0.5">
            AVISO
          </span>
        )}
      </div>
    </div>
  );
}

function InstallSnippet({ apiKey, baseUrl }: { apiKey: string; baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script async src="${baseUrl}/tracker.js" data-key="${apiKey}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Snippet copiado!");
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <IconCode size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold text-zinc-400">HTML</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 gap-1.5 text-xs text-zinc-500 hover:text-zinc-100 px-2"
        >
          {copied ? (
            <IconCheck size={12} className="text-emerald-400" />
          ) : (
            <IconCopy size={12} />
          )}
          {copied ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <pre className="px-4 py-3 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
    </div>
  );
}

interface LiveEvent {
  id: string;
  eventType: string;
  source: string | null;
  device: string | null;
  createdAt: Date;
}

function LiveMonitor({ organizationId }: { organizationId: string }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [newCount, setNewCount] = useState(0);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      const result = await checkEvents({ organizationId });
      setLastChecked(new Date());

      const allEvents = result.count > 0 && result.latestEvent
        ? [result.latestEvent]
        : [];

      const fresh = allEvents.filter((e) => !seenIds.current.has(e.id));
      if (fresh.length > 0) {
        fresh.forEach((e) => seenIds.current.add(e.id));
        setEvents((prev) => {
          const merged = [...fresh, ...prev].slice(0, 20);
          return merged;
        });
        setNewCount((n) => n + fresh.length);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [organizationId, isPolling]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 border border-emerald-600/30 shrink-0">
            <IconActivity size={14} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Monitor ao vivo</h3>
            <p className="text-xs text-zinc-500">
              Polling a cada 5s — eventos dos últimos 5 minutos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[10px] text-zinc-600 font-mono">
              Atualizado {dayjs(lastChecked).fromNow()}
            </span>
          )}
          {newCount > 0 && (
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/30 border border-emerald-800/30 rounded px-2 py-0.5">
              +{newCount} novo(s)
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsPolling((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
              isPolling
                ? "border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/40"
                : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {isPolling ? (
              <>
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Ao vivo
              </>
            ) : (
              <>
                <IconRefresh size={12} />
                Pausado
              </>
            )}
          </button>
        </div>
      </div>

      <div className="divide-y divide-zinc-800/60">
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-600">
              Aguardando eventos nos últimos 5 minutos...
            </p>
            <p className="text-xs text-zinc-700 mt-1">
              Dispare um evento no seu site para vê-lo aparecer aqui
            </p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[11px] font-mono font-semibold text-indigo-300 bg-indigo-950/50 border border-indigo-900/40 rounded px-1.5 py-0.5">
                {event.eventType}
              </span>
              {event.source && (
                <span className="text-xs text-zinc-500">{event.source}</span>
              )}
              {event.device && (
                <span className="text-xs text-zinc-600 font-mono">{event.device}</span>
              )}
              <span className="ml-auto text-xs text-zinc-700 tabular-nums">
                {dayjs(event.createdAt).fromNow()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function buildChecklist(result: IDebugResult, orgName: string): CheckItem[] {
  const checks: CheckItem[] = [
    {
      icon: IconWorld,
      label: "Página acessível",
      detail: result.httpStatus ? `HTTP ${result.httpStatus}` : undefined,
      status: result.pageAccessible ? "ok" : "error",
    },
    {
      icon: IconCode,
      label: "tracker.js encontrado no HTML",
      detail: result.scriptSrc ?? undefined,
      status: result.trackerFound
        ? "ok"
        : result.pageAccessible
        ? "error"
        : "idle",
    },
    {
      icon: IconKey,
      label: "Atributo data-key presente",
      detail: result.apiKeyValue
        ? `${result.apiKeyValue.slice(0, 8)}...${result.apiKeyValue.slice(-4)}`
        : undefined,
      status: result.apiKeyFound
        ? "ok"
        : result.trackerFound
        ? "error"
        : "idle",
    },
    {
      icon: IconShieldCheck,
      label: "API key válida no sistema",
      status: result.keyValid ? "ok" : result.apiKeyFound ? "error" : "idle",
    },
    {
      icon: IconBuilding,
      label: `API key pertence a "${orgName}"`,
      status: result.keyBelongsToOrg
        ? "ok"
        : result.keyValid
        ? "error"
        : "idle",
    },
    {
      icon: IconClock,
      label: "API key ativa e não expirada",
      status: result.keyExpired
        ? "error"
        : result.keyValid
        ? "ok"
        : "idle",
    },
  ];

  return checks;
}

import { IconBuilding } from "@tabler/icons-react";

export function DebugContent() {
  const { organization } = useOrganization();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IDebugResult | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : ""
  );

  const isValid = (() => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  })();

  const handleDiagnose = async () => {
    if (!organization?.id || !isValid) return;
    setIsLoading(true);
    setResult(null);
    setShowMonitor(false);

    const res = await debugUrl({ url, organizationId: organization.id });
    setResult(res);

    if (res.keyBelongsToOrg && !res.keyExpired) {
      setShowMonitor(true);
    }

    setIsLoading(false);
  };

  const overallOk = result?.keyBelongsToOrg && !result.keyExpired;
  const hasWarnings = (result?.warnings.length ?? 0) > 0;
  const hasErrors = (result?.errors.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-600/30 shrink-0">
          <IconBug size={16} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Debug do Tracker</h1>
          <p className="text-xs text-zinc-500">
            Verifique se o tracker.js está instalado corretamente no seu site
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            URL do seu site
          </label>
          <p className="text-xs text-zinc-600 mt-0.5">
            Cole a URL de qualquer página onde o tracker.js deve estar instalado
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid && !isLoading) handleDiagnose();
              }}
              placeholder="https://meusite.com.br"
              className="pl-9 h-10 bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 font-mono text-sm focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600/50"
            />
          </div>
          <Button
            onClick={handleDiagnose}
            disabled={!isValid || isLoading || !organization}
            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 shrink-0"
          >
            {isLoading ? (
              <>
                <IconLoader2 size={15} className="animate-spin" />
                <span className="hidden sm:inline">Analisando...</span>
              </>
            ) : (
              <>
                <IconBug size={15} />
                <span className="hidden sm:inline">Diagnosticar</span>
              </>
            )}
          </Button>
        </div>

        {url && !isValid && (
          <p className="text-xs text-amber-500">
            URL inválida — inclua o protocolo (https://)
          </p>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <div
            className={cn(
              "rounded-xl border p-4",
              overallOk
                ? "border-emerald-800/40 bg-emerald-950/20"
                : hasErrors
                ? "border-red-800/40 bg-red-950/20"
                : "border-amber-800/40 bg-amber-950/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {overallOk ? (
                <IconCircleCheck size={18} className="text-emerald-400 shrink-0" />
              ) : hasErrors ? (
                <IconCircleX size={18} className="text-red-400 shrink-0" />
              ) : (
                <IconAlertTriangle size={18} className="text-amber-400 shrink-0" />
              )}
              <p
                className={cn(
                  "text-sm font-bold",
                  overallOk
                    ? "text-emerald-300"
                    : hasErrors
                    ? "text-red-300"
                    : "text-amber-300"
                )}
              >
                {overallOk
                  ? "Tracker instalado corretamente!"
                  : hasErrors
                  ? "Problemas encontrados na instalação"
                  : "Instalação com avisos"}
              </p>
            </div>
            <p
              className={cn(
                "text-xs font-mono break-all",
                overallOk ? "text-emerald-700" : hasErrors ? "text-red-700" : "text-amber-700"
              )}
            >
              {url}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1.5 inline-flex items-center gap-0.5 hover:opacity-70"
              >
                <IconExternalLink size={11} />
              </a>
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                  <h3 className="text-sm font-bold text-zinc-100">Checklist de instalação</h3>
                </div>
                <div className="px-4">
                  {buildChecklist(result, organization?.name ?? "esta organização").map(
                    (item, i) => (
                      <CheckRow key={i} item={item} />
                    )
                  )}
                </div>
              </div>

              {(hasErrors || hasWarnings) && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                  <h3 className="text-sm font-bold text-zinc-100">Detalhes</h3>
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <IconCircleX size={13} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">{e}</p>
                    </div>
                  ))}
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <IconAlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {!result.trackerFound && result.pageAccessible && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-100">Como instalar o tracker.js</h3>
                  <p className="text-xs text-zinc-500">
                    Cole este script no <code className="text-zinc-400">&lt;head&gt;</code> de todas as
                    páginas do seu site, substituindo sua API key abaixo.
                  </p>
                  <div>
                    <label className="text-[11px] text-zinc-600 uppercase tracking-wider">
                      URL base do GrowthOS
                    </label>
                    <input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                      placeholder="https://seu-dominio.com"
                    />
                  </div>
                  <InstallSnippet
                    apiKey={result.apiKeyValue ?? "SUA_API_KEY"}
                    baseUrl={baseUrl}
                  />
                </div>
              )}
            </div>

            {showMonitor && organization?.id && (
              <LiveMonitor organizationId={organization.id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
