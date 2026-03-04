"use client";

import { useState, useEffect } from "react";
import { IconLoader2, IconArrowRight, IconWorld } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateOrganizationRegional } from "@/actions/organizations/update-organization-regional.action";
import {
  TIMEZONE_OPTIONS,
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  LANGUAGE_OPTIONS,
  detectBrowserRegional,
} from "@/utils/regional-options";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface StepRegionalConfigProps {
  organizationId: string;
  onComplete: () => void;
}

const selectClass =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function StepRegionalConfig({ organizationId, onComplete }: StepRegionalConfigProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [currency, setCurrency] = useState("BRL");
  const [locale, setLocale] = useState("pt-BR");
  const [language, setLanguage] = useState("pt-BR");
  const [country, setCountry] = useState("BR");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    const regional = detectBrowserRegional();
    setTimezone(regional.timezone);
    setCurrency(regional.currency);
    setLocale(regional.locale);
    setLanguage(regional.language);
    setCountry(regional.country);
    setDetected(true);
  }, []);

  const handleLocaleChange = (value: string) => {
    setLocale(value);
    const matched = LOCALE_OPTIONS.find((l) => l.value === value);
    if (matched) {
      setCurrency(matched.currency);
      setCountry(matched.country);
      setLanguage(matched.language);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateOrganizationRegional({
        organizationId,
        timezone,
        currency,
        locale,
        country,
        language,
      });
      toast.success("Configurações regionais salvas!");
      onComplete();
    } catch {
      toast.error("Erro ao salvar configurações regionais.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30">
            <IconWorld size={18} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Configurações regionais</h2>
            <p className="text-xs text-zinc-500">
              Detectamos suas preferências — confirme ou ajuste
            </p>
          </div>
        </div>

        {detected && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-600/20 bg-indigo-600/10 px-3 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <p className="text-xs text-indigo-300">
              Valores detectados automaticamente pelo navegador
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            Localização
          </Label>
          <select
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
            className={selectClass}
          >
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-600">
            Define moeda, país e idioma automaticamente
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
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
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
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
          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            Fuso horário
          </Label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={selectClass}
          >
            {TIMEZONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-600">
            Define como "hoje" e "esta semana" são interpretados nos relatórios
          </p>
        </div>

        <div className={cn(
          "rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 space-y-1"
        )}>
          <p className="text-xs font-semibold text-zinc-400">Resumo</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>Moeda: <span className="text-zinc-300 font-mono">{currency}</span></span>
            <span>Locale: <span className="text-zinc-300 font-mono">{locale}</span></span>
            <span>Idioma IA: <span className="text-zinc-300 font-mono">{language}</span></span>
            <span>Timezone: <span className="text-zinc-300 font-mono truncate">{timezone}</span></span>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
        >
          {isLoading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              Continuar
              <IconArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
