"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconWorld,
  IconLoader2,
  IconCheck,
  IconExternalLink,
  IconEyeOff,
  IconEye,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { updatePublicPageSettings } from "@/actions/organizations/update-public-page-settings.action";
import { DEFAULT_PUBLIC_PAGE_SETTINGS } from "@/db/schema/organization.schema";
import type { IOrganization } from "@/interfaces/organization.interface";
import type { IPublicPageSettings } from "@/interfaces/public-page.interface";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-50" />
    </label>
  );
}

interface MetricToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function MetricToggle({ label, description, checked, onChange }: MetricToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-zinc-800/60 last:border-b-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={cn("shrink-0", checked ? "text-zinc-400" : "text-zinc-600")}>
          {checked ? <IconEye size={13} /> : <IconEyeOff size={13} />}
        </span>
        <div>
          <p className={cn("text-xs font-semibold", checked ? "text-zinc-200" : "text-zinc-500")}>
            {label}
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

interface PublicPageSectionProps {
  org: IOrganization;
}

export function PublicPageSection({ org }: PublicPageSectionProps) {
  const defaultSettings: IPublicPageSettings = {
    ...DEFAULT_PUBLIC_PAGE_SETTINGS,
    ...(org.publicPageSettings ?? {}),
  };

  const [enabled, setEnabled] = useState(org.publicPageEnabled);
  const [description, setDescription] = useState(org.publicDescription ?? "");
  const [settings, setSettings] = useState<IPublicPageSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSetting = <K extends keyof IPublicPageSettings>(key: K, value: IPublicPageSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updatePublicPageSettings({
      organizationId: org.id,
      publicPageEnabled: enabled,
      publicDescription: description.trim() || null,
      publicPageSettings: settings,
    }).catch((err: Error) => {
      toast.error(err.message ?? "Erro ao salvar configurações.");
      setIsSaving(false);
      return null;
    });

    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Configurações da página pública salvas!");
  };

  const publicUrl = `/p/${org.slug}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20">
            <IconWorld size={14} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Página Pública</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Compartilhe suas métricas publicamente — building in public
            </p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      <div className={cn("p-5 space-y-5", !enabled && "opacity-50 pointer-events-none")}>
        {enabled && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-800/30 bg-indigo-900/10 px-3 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-xs text-zinc-400 flex-1 min-w-0 truncate">
              {typeof window !== "undefined" ? `${window.location.origin}${publicUrl}` : publicUrl}
            </p>
            <Link
              href={publicUrl}
              target="_blank"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold shrink-0 transition-colors"
            >
              <IconExternalLink size={12} />
              Ver
            </Link>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
            Descrição pública
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Plataforma SaaS de convites digitais"
            maxLength={200}
            className="h-9 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          />
          <p className="text-[10px] text-zinc-600">{description.length}/200 caracteres</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              Métricas visíveis
            </p>
          </div>
          <div className="px-4">
            <MetricToggle
              label="Valores absolutos"
              description="Quando desativado, exibe faixas (ex: R$ 4k–5k) em vez dos valores reais"
              checked={settings.showAbsoluteValues}
              onChange={(v) => updateSetting("showAbsoluteValues", v)}
            />
            <MetricToggle
              label="MRR"
              description="Receita Recorrente Mensal"
              checked={settings.showMrr}
              onChange={(v) => updateSetting("showMrr", v)}
            />
            <MetricToggle
              label="Assinantes ativos"
              description="Total de assinantes ativos"
              checked={settings.showSubscribers}
              onChange={(v) => updateSetting("showSubscribers", v)}
            />
            <MetricToggle
              label="Churn"
              description="Taxa de cancelamento mensal de assinantes"
              checked={settings.showChurn}
              onChange={(v) => updateSetting("showChurn", v)}
            />
            <MetricToggle
              label="ARPU"
              description="Receita média por assinante"
              checked={settings.showArpu}
              onChange={(v) => updateSetting("showArpu", v)}
            />
            <MetricToggle
              label="Receita mensal"
              description="Receita total do mês (vendas avulsas e recorrência)"
              checked={settings.showRevenue}
              onChange={(v) => updateSetting("showRevenue", v)}
            />
            <MetricToggle
              label="Ticket médio"
              description="Valor médio por pedido ou venda"
              checked={settings.showTicketMedio}
              onChange={(v) => updateSetting("showTicketMedio", v)}
            />
            <MetricToggle
              label="Taxa de recompra"
              description="Percentual de clientes que voltaram a comprar nos últimos 90 dias"
              checked={settings.showRepurchaseRate}
              onChange={(v) => updateSetting("showRepurchaseRate", v)}
            />
            <MetricToggle
              label="Split de receita"
              description="Barra mostrando proporção recorrente vs avulso"
              checked={settings.showRevenueSplit}
              onChange={(v) => updateSetting("showRevenueSplit", v)}
            />
            <MetricToggle
              label="Sankey de assinantes"
              description="Fluxo visual de novas assinaturas, renovações e cancelamentos"
              checked={settings.showSankey}
              onChange={(v) => updateSetting("showSankey", v)}
            />
            <MetricToggle
              label="Gráfico de evolução"
              description="Gráfico de linha com histórico de receita/MRR"
              checked={settings.showGrowthChart}
              onChange={(v) => updateSetting("showGrowthChart", v)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
          >
            {isSaving ? (
              <IconLoader2 size={13} className="animate-spin" />
            ) : saved ? (
              <IconCheck size={13} className="text-emerald-300" />
            ) : (
              <IconCheck size={13} />
            )}
            {saved ? "Salvo!" : "Salvar configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
