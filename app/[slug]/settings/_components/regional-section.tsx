"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconWorld, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateOrganizationRegional } from "@/actions/organizations/update-organization-regional.action";
import { getOrganizationsQueryKey } from "@/hooks/queries/use-organizations";
import {
  TIMEZONE_OPTIONS,
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/utils/regional-options";
import toast from "react-hot-toast";

interface RegionalSectionProps {
  orgId: string;
  currentTimezone: string;
  currentCurrency: string;
  currentLocale: string;
  currentCountry: string;
  currentLanguage: string;
}

const selectClass =
  "h-9 flex-1 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none";

export function RegionalSection({
  orgId,
  currentTimezone,
  currentCurrency,
  currentLocale,
  currentCountry,
  currentLanguage,
}: RegionalSectionProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState(currentTimezone);
  const [currency, setCurrency] = useState(currentCurrency);
  const [locale, setLocale] = useState(currentLocale);
  const [country, setCountry] = useState(currentCountry);
  const [language, setLanguage] = useState(currentLanguage);

  const hasChanges =
    timezone !== currentTimezone ||
    currency !== currentCurrency ||
    locale !== currentLocale ||
    country !== currentCountry ||
    language !== currentLanguage;

  const handleLocaleChange = (value: string) => {
    setLocale(value);
    const matched = LOCALE_OPTIONS.find((l) => l.value === value);
    if (matched) {
      setCurrency(matched.currency);
      setCountry(matched.country);
      setLanguage(matched.language);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganizationRegional({
        organizationId: orgId,
        timezone,
        currency,
        locale,
        country,
        language,
      });
      await queryClient.invalidateQueries({ queryKey: getOrganizationsQueryKey() });
      toast.success("Configurações regionais atualizadas!");
    } catch {
      toast.error("Erro ao salvar configurações regionais.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <IconWorld size={15} className="text-indigo-400" />
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Configurações Regionais</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Define moeda base, timezone, locale e idioma da IA para toda a organização
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            Localização
          </Label>
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-600">
            Altera moeda, país e idioma automaticamente
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="space-y-2 flex-1 min-w-[180px]">
            <Label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              Moeda base
            </Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={selectClass}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value} — {opt.label.split(" (")[0]}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-600">
              Todos os valores no dashboard são convertidos para esta moeda
            </p>
          </div>

          <div className="space-y-2 flex-1 min-w-[180px]">
            <Label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              Idioma da IA
            </Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={selectClass}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            Fuso horário
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-9 flex-1 min-w-[240px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-zinc-600">
            Define como "hoje" e filtros de data são interpretados nos relatórios
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-indigo-600 hover:bg-indigo-500 text-white h-9 text-xs gap-2"
        >
          {saving && <IconLoader2 size={13} className="animate-spin" />}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
