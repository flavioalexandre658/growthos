"use client";

import { useState } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrganizations } from "@/hooks/queries/use-organizations";
import { useApiKeys } from "@/hooks/queries/use-api-keys";
import { useCreateApiKey } from "@/hooks/mutations/use-create-api-key";
import { useDeleteApiKey } from "@/hooks/mutations/use-delete-api-key";
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconKey,
  IconCode,
  IconClock,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const EXPIRY_OPTIONS: { label: string; days: number | undefined }[] = [
  { label: "Nunca", days: undefined },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "1 ano", days: 365 },
];

function ApiKeyRow({
  id,
  keyValue,
  name,
  createdAt,
  lastUsedAt,
  expiresAt,
  onDelete,
  isDeleting,
}: {
  id: string;
  keyValue: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = expiresAt && new Date() > expiresAt;
  const expiresLabel = expiresAt
    ? isExpired
      ? "Expirada"
      : `Expira ${dayjs(expiresAt).fromNow()}`
    : null;

  const lastUsedLabel = lastUsedAt
    ? `Último uso ${dayjs(lastUsedAt).fromNow()}`
    : "Nunca usada";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        isExpired
          ? "border-red-800/50 bg-red-950/20"
          : "border-zinc-800 bg-zinc-900/40"
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 shrink-0 mt-0.5">
        <IconKey size={14} className={isExpired ? "text-red-400" : "text-indigo-400"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-zinc-200">{name}</p>
          {isExpired && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded-md border border-red-800/40">
              <IconAlertTriangle size={10} />
              Expirada
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-zinc-500 truncate mt-0.5">{keyValue}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          <p className="text-[10px] text-zinc-600 flex items-center gap-1">
            <IconClock size={10} />
            {lastUsedLabel}
          </p>
          {expiresLabel && (
            <p className={cn("text-[10px] flex items-center gap-1", isExpired ? "text-red-500" : "text-zinc-600")}>
              <IconClock size={10} />
              {expiresLabel}
            </p>
          )}
          <p className="text-[10px] text-zinc-700">
            Criada {dayjs(createdAt).format("DD/MM/YYYY")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
          title="Copiar chave"
        >
          {copied ? <IconCheck size={14} className="text-emerald-400" /> : <IconCopy size={14} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(id)}
          disabled={isDeleting}
          className="h-7 w-7 text-zinc-600 hover:text-red-400"
          title="Revogar chave"
        >
          <IconTrash size={14} />
        </Button>
      </div>
    </div>
  );
}

function InstallSnippet({ apiKey, baseUrl }: { apiKey: string; baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${baseUrl}/tracker.js" data-key="${apiKey}"></script>`;

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
          {copied ? <IconCheck size={12} className="text-emerald-400" /> : <IconCopy size={12} />}
          {copied ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <pre className="px-4 py-3 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
    </div>
  );
}

function CreateKeyForm({
  orgId,
  orgName,
  keyCount,
  onCreate,
  isCreating,
}: {
  orgId: string;
  orgName: string;
  keyCount: number;
  onCreate: (input: { organizationId: string; name: string; expiresDays: number | undefined }) => void;
  isCreating: boolean;
}) {
  const [expiresDays, setExpiresDays] = useState<number | undefined>(undefined);

  const handleCreate = () => {
    onCreate({
      organizationId: orgId,
      name: `${orgName} Key ${keyCount + 1}`,
      expiresDays,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={expiresDays ?? ""}
        onChange={(e) => setExpiresDays(e.target.value === "" ? undefined : Number(e.target.value))}
        className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
      >
        {EXPIRY_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.days ?? ""}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={handleCreate}
        disabled={isCreating}
        className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5 text-xs"
      >
        <IconPlus size={13} />
        Nova Key
      </Button>
    </div>
  );
}

function OrgApiKeysSection({ orgId, orgName }: { orgId: string; orgName: string }) {
  const { data: keys, isLoading } = useApiKeys(orgId);
  const createMutation = useCreateApiKey(orgId);
  const deleteMutation = useDeleteApiKey(orgId);

  const [baseUrl, setBaseUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : ""
  );

  const handleCreate = async (input: { organizationId: string; name: string; expiresDays: number | undefined }) => {
    const result = await createMutation.mutateAsync(input);
    if (result?.[0]) {
      toast.success("Nova API key criada!");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    toast.success("API key revogada.");
  };

  const firstActiveKey = keys?.find((k) => k.isActive && (!k.expiresAt || new Date() < k.expiresAt));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{orgName}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            API keys para autenticar o tracker.js
          </p>
        </div>
        <CreateKeyForm
          orgId={orgId}
          orgName={orgName}
          keyCount={keys?.length ?? 0}
          onCreate={handleCreate}
          isCreating={createMutation.isPending}
        />
      </div>

      <div className="p-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-zinc-800" />
          ))
        ) : keys?.length === 0 ? (
          <p className="text-center py-6 text-zinc-600 text-sm">
            Nenhuma API key criada ainda.
          </p>
        ) : (
          keys?.map((k) => (
            <ApiKeyRow
              key={k.id}
              id={k.id}
              keyValue={k.key}
              name={k.name}
              createdAt={k.createdAt}
              lastUsedAt={k.lastUsedAt}
              expiresAt={k.expiresAt}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}

        {firstActiveKey && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Snippet de Instalação
            </p>
            <div className="mb-2">
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
            <InstallSnippet apiKey={firstActiveKey.key} baseUrl={baseUrl} />
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Cole este script no <code className="text-zinc-400">&lt;head&gt;</code> de qualquer página do seu site.
              O tracker.js captura automaticamente pageviews, UTMs, device e referrer.
              Use <code className="text-zinc-400">window.GrowthOS.track()</code> para eventos manuais.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsContent() {
  const { organizations } = useOrganization();
  const { isLoading } = useOrganizations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Configurações</h1>
        <p className="text-xs text-zinc-500">Gerencie organizações, API keys e instalação do tracker</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-bold text-zinc-100 mb-1">Como instalar o tracker</h3>
        <p className="text-xs text-zinc-500 mb-4">
          O tracker.js coleta dados automaticamente — sem npm, sem SDK, sem endpoints exclusivos no seu sistema.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "1. Gere uma API key", desc: "Cada organização tem sua própria key para autenticar os eventos" },
            { label: "2. Cole o script no <head>", desc: "Um único script captura pageviews, UTMs, device e referrer automaticamente" },
            { label: "3. Dispare eventos manuais", desc: "Use GrowthOS.track('payment', {...}) para enviar dados financeiros" },
          ].map((step) => (
            <div key={step.label} className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs font-bold text-indigo-400">{step.label}</p>
              <p className="text-xs text-zinc-500 mt-1">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl bg-zinc-800" />
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => (
            <OrgApiKeysSection key={org.id} orgId={org.id} orgName={org.name} />
          ))}
        </div>
      )}
    </div>
  );
}
