"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/components/providers/organization-provider";
import { debugUrl } from "@/actions/events/debug-url.action";
import { checkEvents } from "@/actions/dashboard/check-events.action";
import { sendTestEvent } from "@/actions/events/send-test-event.action";
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
  IconBuilding,
  IconFlask,
  IconHistory,
  IconChevronDown,
  IconArrowRight,
  IconCircleDot,
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

interface DiagnosticHistoryEntry {
  url: string;
  timestamp: string;
  success: boolean;
  errorCount: number;
  warningCount: number;
}

function getStorageKey(key: string, orgId: string) {
  return `growthOS:debug:${key}:${orgId}`;
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
          item.status === "pending" && "bg-indigo-600/20 border border-indigo-600/30",
          item.status === "idle" && "bg-zinc-800/40"
        )}
      >
        {item.status === "pending" ? (
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
        ) : (
          <Icon
            size={12}
            className={cn(
              item.status === "ok" && "text-emerald-400",
              item.status === "error" && "text-red-400",
              item.status === "warning" && "text-amber-400",
              item.status === "idle" && "text-zinc-700"
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
            item.status === "idle" && "text-zinc-700",
            item.status === "pending" && "text-zinc-300"
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
        {item.status === "pending" && (
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950/30 border border-indigo-800/30 rounded px-1.5 py-0.5">
            ...
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

interface LiveMonitorProps {
  organizationId: string;
  onLatestEvent?: (event: LiveEvent | null) => void;
}

function LiveMonitor({ organizationId, onLatestEvent }: LiveMonitorProps) {
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
        onLatestEvent?.(fresh[0] ?? null);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [organizationId, isPolling, onLatestEvent]);

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
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-zinc-600">
              Aguardando eventos nos últimos 5 minutos...
            </p>
            <p className="text-xs text-zinc-700 mt-1">
              Dispare um evento no seu site ou use o botão de evento de teste
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
  return [
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
}

const PREVIEW_CHECKS = [
  { icon: IconWorld, label: "Página acessível" },
  { icon: IconCode, label: "Script tracker.js no HTML" },
  { icon: IconKey, label: "Atributo data-key presente" },
  { icon: IconShieldCheck, label: "API key válida no sistema" },
  { icon: IconBuilding, label: "Pertence a esta organização" },
  { icon: IconClock, label: "API key ativa e não expirada" },
];

function EmptyState() {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 space-y-5">
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-zinc-400">
          Cole a URL do seu site acima e clique em Diagnosticar
        </p>
        <p className="text-xs text-zinc-600">
          Verificaremos automaticamente se o tracker.js está instalado corretamente
        </p>
      </div>
      <div className="space-y-1">
        {PREVIEW_CHECKS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 py-2 border-b border-zinc-800/40 last:border-0">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800/40 shrink-0">
              <Icon size={11} className="text-zinc-700" />
            </div>
            <p className="text-sm text-zinc-700">{label}</p>
            <div className="ml-auto h-1.5 w-12 rounded-full bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosticHistory({
  orgId,
  onRerun,
}: {
  orgId: string;
  onRerun: (url: string) => void;
}) {
  const [entries, setEntries] = useState<DiagnosticHistoryEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey("history", orgId));
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [orgId]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <IconHistory size={14} className="text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Histórico de diagnósticos
          </span>
          <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">
            {entries.length}
          </span>
        </div>
        <IconChevronDown
          size={14}
          className={cn(
            "text-zinc-600 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="divide-y divide-zinc-800/40 border-t border-zinc-800/60">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="shrink-0">
                {entry.success ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                ) : entry.errorCount > 0 ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 font-mono truncate">{entry.url}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {dayjs(entry.timestamp).fromNow()}
                  {entry.errorCount > 0 && (
                    <span className="ml-1.5 text-red-500">· {entry.errorCount} erro(s)</span>
                  )}
                  {entry.warningCount > 0 && (
                    <span className="ml-1.5 text-amber-500">· {entry.warningCount} aviso(s)</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRerun(entry.url)}
                className="shrink-0 flex items-center gap-1 text-[10px] text-zinc-600 hover:text-indigo-400 transition-colors"
              >
                <IconRefresh size={11} />
                Retestar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DebugContent() {
  const { organization } = useOrganization();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IDebugResult | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : ""
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [latestLiveEvent, setLatestLiveEvent] = useState<{ createdAt: Date } | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    if (!organization?.id) return;
    try {
      const stored = localStorage.getItem(getStorageKey("lastUrl", organization.id));
      if (stored) setUrl(stored);
    } catch {
      // ignore
    }
  }, [organization?.id]);

  const isValid = (() => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  })();

  const saveHistory = (diagUrl: string, diagResult: IDebugResult) => {
    if (!organization?.id) return;
    try {
      const key = getStorageKey("history", organization.id);
      const raw = localStorage.getItem(key);
      const existing: DiagnosticHistoryEntry[] = raw ? JSON.parse(raw) : [];
      const entry: DiagnosticHistoryEntry = {
        url: diagUrl,
        timestamp: new Date().toISOString(),
        success: diagResult.keyBelongsToOrg && !diagResult.keyExpired,
        errorCount: diagResult.errors.length,
        warningCount: diagResult.warnings.length,
      };
      const updated = [entry, ...existing.filter((e) => e.url !== diagUrl)].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(updated));
      setHistoryKey((k) => k + 1);
    } catch {
      // ignore
    }
  };

  const handleDiagnose = async (diagUrl?: string) => {
    const targetUrl = diagUrl ?? url;
    if (!organization?.id || !targetUrl) return;

    try {
      new URL(targetUrl);
    } catch {
      return;
    }

    if (diagUrl) setUrl(diagUrl);

    setIsLoading(true);
    setResult(null);
    setShowMonitor(false);
    setLatestLiveEvent(null);

    const res = await debugUrl({
      url: targetUrl,
      organizationId: organization.id,
      orgSlug: organization.slug,
    });
    setResult(res);

    try {
      localStorage.setItem(getStorageKey("lastUrl", organization.id), targetUrl);
    } catch {
      // ignore
    }

    saveHistory(targetUrl, res);

    if (res.keyBelongsToOrg && !res.keyExpired) {
      setShowMonitor(true);
    }

    setIsLoading(false);
  };

  const handleSendTest = async () => {
    if (!organization?.id) return;
    setIsSendingTest(true);
    const start = Date.now();
    try {
      await sendTestEvent({ organizationId: organization.id });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      toast.success(`Evento de teste recebido em ${elapsed}s`);
    } catch {
      toast.error("Erro ao enviar evento de teste");
    }
    setIsSendingTest(false);
  };

  const overallOk = result?.keyBelongsToOrg && !result.keyExpired;
  const hasWarnings = (result?.warnings.length ?? 0) > 0;
  const hasErrors = (result?.errors.length ?? 0) > 0;
  const errorCount = result?.errors.length ?? 0;

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
            onClick={() => handleDiagnose()}
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

      {!result && !isLoading && <EmptyState />}

      {result && (
        <div className="space-y-4">
          {overallOk ? (
            <div className="relative rounded-xl border border-emerald-800/40 bg-emerald-950/20 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl" />
              <div className="pl-5 pr-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/20 border border-emerald-600/30">
                      <IconCircleCheck size={20} className="text-emerald-400" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-emerald-300">Tracker instalado corretamente!</p>
                    <p className="text-xs text-emerald-700 font-mono truncate">
                      pertence a: {organization?.name}
                    </p>
                    {latestLiveEvent && (
                      <p className="text-[10px] text-emerald-800 mt-0.5">
                        último evento {dayjs(latestLiveEvent.createdAt).fromNow()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleSendTest}
                  disabled={isSendingTest}
                  size="sm"
                  className="shrink-0 h-8 gap-1.5 bg-emerald-700/40 hover:bg-emerald-700/60 border border-emerald-600/30 text-emerald-300 text-xs font-semibold"
                >
                  {isSendingTest ? (
                    <IconLoader2 size={12} className="animate-spin" />
                  ) : (
                    <IconFlask size={12} />
                  )}
                  Enviar evento de teste
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-red-800/40 bg-red-950/20">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />
              <div className="pl-5 pr-4 py-4 flex items-center gap-3">
                {hasErrors ? (
                  <IconCircleX size={18} className="text-red-400 shrink-0" />
                ) : (
                  <IconAlertTriangle size={18} className="text-amber-400 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={cn("text-sm font-bold", hasErrors ? "text-red-300" : "text-amber-300")}>
                    {hasErrors
                      ? `${errorCount} problema${errorCount !== 1 ? "s" : ""} encontrado${errorCount !== 1 ? "s" : ""}`
                      : "Instalação com avisos"}
                  </p>
                  <p className={cn("text-xs font-mono break-all mt-0.5", hasErrors ? "text-red-700" : "text-amber-700")}>
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
              </div>
            </div>
          )}

          <div className={cn(
            "grid gap-4 items-start",
            showMonitor ? "grid-cols-1 xl:grid-cols-[1fr_380px]" : "grid-cols-1 xl:grid-cols-2"
          )}>
            <div className={cn("space-y-4", !showMonitor && "xl:col-span-2")}>
              <div className={cn(
                "grid gap-4",
                !showMonitor && (hasErrors || hasWarnings) ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
              )}>
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
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-zinc-100">Detalhes e soluções</h3>
                    {result.errors.map((e, i) => (
                      <div key={i} className="rounded-lg border border-red-900/30 bg-red-950/20 p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <IconCircleX size={13} className="text-red-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-300 font-medium">{e.message}</p>
                        </div>
                        <div className="flex items-start gap-2 pl-5">
                          <IconArrowRight size={11} className="text-zinc-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-400">{e.suggestion}</p>
                        </div>
                        {e.link && (
                          <div className="pl-5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(e.link!.href)}
                              className="h-6 px-2 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 gap-1"
                            >
                              {e.link.label}
                              <IconArrowRight size={10} />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {result.warnings.map((w, i) => (
                      <div key={i} className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-3">
                        <div className="flex items-start gap-2">
                          <IconAlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-300">{w}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
              <div className="space-y-3">
                <LiveMonitor
                  organizationId={organization.id}
                  onLatestEvent={(ev) => ev && setLatestLiveEvent(ev)}
                />
                {overallOk && (
                  <Button
                    onClick={handleSendTest}
                    disabled={isSendingTest}
                    variant="outline"
                    className="w-full h-9 gap-2 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  >
                    {isSendingTest ? (
                      <IconLoader2 size={13} className="animate-spin" />
                    ) : (
                      <IconFlask size={13} />
                    )}
                    Enviar evento de teste
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {organization?.id && (
        <DiagnosticHistory
          key={historyKey}
          orgId={organization.id}
          onRerun={handleDiagnose}
        />
      )}
    </div>
  );
}
