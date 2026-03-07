"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  IconWorld,
  IconLoader2,
  IconCheck,
  IconExternalLink,
  IconEyeOff,
  IconEye,
  IconRefresh,
  IconRepeat,
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

const RECURRING_KEYS = ["showMrr", "showSubscribers", "showChurn", "showArpu", "showSankey"] as const;
const ONE_TIME_KEYS = ["showRevenue", "showTicketMedio", "showRepurchaseRate", "showRevenueSplit"] as const;

type RecurringKey = typeof RECURRING_KEYS[number];
type OneTimeKey = typeof ONE_TIME_KEYS[number];

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

interface MetricBlockProps {
  title: string;
  icon: React.ReactNode;
  accentClass: string;
  activeCount: number;
  totalCount: number;
  allOff: boolean;
  onBulkToggle: () => void;
  showAllLabel: string;
  hideAllLabel: string;
  children: React.ReactNode;
}

function MetricBlock({
  title,
  icon,
  accentClass,
  activeCount,
  totalCount,
  allOff,
  onBulkToggle,
  showAllLabel,
  hideAllLabel,
  children,
}: MetricBlockProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className={cn("shrink-0", accentClass)}>{icon}</span>
          <p className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
            {title}
          </p>
          <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 rounded">
            {activeCount}/{totalCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onBulkToggle}
          className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        >
          {allOff ? (
            <>
              <IconEye size={12} />
              {showAllLabel}
            </>
          ) : (
            <>
              <IconEyeOff size={12} />
              {hideAllLabel}
            </>
          )}
        </button>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

interface PublicPageSectionProps {
  org: IOrganization;
}

export function PublicPageSection({ org }: PublicPageSectionProps) {
  const t = useTranslations("settings.publicPage");
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

  const bulkSetRecurring = (value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev };
      for (const key of RECURRING_KEYS) {
        (next as Record<string, boolean>)[key] = value;
      }
      return next;
    });
  };

  const bulkSetOneTime = (value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev };
      for (const key of ONE_TIME_KEYS) {
        (next as Record<string, boolean>)[key] = value;
      }
      return next;
    });
  };

  const recurringActiveCount = RECURRING_KEYS.filter((k) => settings[k as RecurringKey]).length;
  const oneTimeActiveCount = ONE_TIME_KEYS.filter((k) => settings[k as OneTimeKey]).length;
  const recurringAllOff = recurringActiveCount === 0;
  const oneTimeAllOff = oneTimeActiveCount === 0;

  const handleSave = async () => {
    setIsSaving(true);
    await updatePublicPageSettings({
      organizationId: org.id,
      publicPageEnabled: enabled,
      publicDescription: description.trim() || null,
      publicPageSettings: settings,
    }).catch((err: Error) => {
      toast.error(err.message ?? t("errorToast"));
      setIsSaving(false);
      return null;
    });

    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 2000);
    toast.success(t("successToast"));
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
            <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t("description")}
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
              {t("viewLink")}
            </Link>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">
            {t("descriptionLabel")}
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            maxLength={200}
            className="h-9 bg-zinc-900 border-zinc-700 text-zinc-200 text-xs placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
          />
          <p className="text-[10px] text-zinc-600">{t("descriptionChars", { count: description.length })}</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              {t("generalSettingsTitle")}
            </p>
          </div>
          <div className="px-4">
            <MetricToggle
              label={t("absoluteValuesLabel")}
              description={t("absoluteValuesDesc")}
              checked={settings.showAbsoluteValues}
              onChange={(v) => updateSetting("showAbsoluteValues", v)}
            />
            <MetricToggle
              label={t("growthChartLabel")}
              description={t("growthChartDesc")}
              checked={settings.showGrowthChart}
              onChange={(v) => updateSetting("showGrowthChart", v)}
            />
          </div>
        </div>

        <MetricBlock
          title={t("recurringTitle")}
          icon={<IconRepeat size={13} />}
          accentClass="text-indigo-400"
          activeCount={recurringActiveCount}
          totalCount={RECURRING_KEYS.length}
          allOff={recurringAllOff}
          onBulkToggle={() => bulkSetRecurring(recurringAllOff)}
          showAllLabel={t("showAllMetrics")}
          hideAllLabel={t("hideAllMetrics")}
        >
          <MetricToggle
            label={t("mrrLabel")}
            description={t("mrrDesc")}
            checked={settings.showMrr}
            onChange={(v) => updateSetting("showMrr", v)}
          />
          <MetricToggle
            label={t("subscribersLabel")}
            description={t("subscribersDesc")}
            checked={settings.showSubscribers}
            onChange={(v) => updateSetting("showSubscribers", v)}
          />
          <MetricToggle
            label={t("churnLabel")}
            description={t("churnDesc")}
            checked={settings.showChurn}
            onChange={(v) => updateSetting("showChurn", v)}
          />
          <MetricToggle
            label={t("arpuLabel")}
            description={t("arpuDesc")}
            checked={settings.showArpu}
            onChange={(v) => updateSetting("showArpu", v)}
          />
          <MetricToggle
            label={t("sankeyLabel")}
            description={t("sankeyDesc")}
            checked={settings.showSankey}
            onChange={(v) => updateSetting("showSankey", v)}
          />
        </MetricBlock>

        <MetricBlock
          title={t("oneTimeTitle")}
          icon={<IconRefresh size={13} />}
          accentClass="text-amber-400"
          activeCount={oneTimeActiveCount}
          totalCount={ONE_TIME_KEYS.length}
          allOff={oneTimeAllOff}
          onBulkToggle={() => bulkSetOneTime(oneTimeAllOff)}
          showAllLabel={t("showAllMetrics")}
          hideAllLabel={t("hideAllMetrics")}
        >
          <MetricToggle
            label={t("revenueLabel")}
            description={t("revenueDesc")}
            checked={settings.showRevenue}
            onChange={(v) => updateSetting("showRevenue", v)}
          />
          <MetricToggle
            label={t("ticketMedioLabel")}
            description={t("ticketMedioDesc")}
            checked={settings.showTicketMedio}
            onChange={(v) => updateSetting("showTicketMedio", v)}
          />
          <MetricToggle
            label={t("repurchaseRateLabel")}
            description={t("repurchaseRateDesc")}
            checked={settings.showRepurchaseRate}
            onChange={(v) => updateSetting("showRepurchaseRate", v)}
          />
          <MetricToggle
            label={t("revenueSplitLabel")}
            description={t("revenueSplitDesc")}
            checked={settings.showRevenueSplit}
            onChange={(v) => updateSetting("showRevenueSplit", v)}
          />
        </MetricBlock>

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
            {saved ? t("saved") : t("saveButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
