"use client";

import { useState, useEffect } from "react";
import { IconAdjustments, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MetricFilterField {
  key: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

interface MetricFiltersPanelProps {
  fields: MetricFilterField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

function NumericInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full min-w-0 h-7 rounded-md border border-zinc-700 bg-zinc-950 px-2",
        "text-[16px] sm:text-xs text-zinc-300 placeholder:text-zinc-700",
        "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      )}
    />
  );
}

export function MetricFiltersPanel({ fields, values, onChange }: MetricFiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) setDraft({ ...values });
  }, [isOpen]);

  const activeCount = Object.values(values).filter((v) => v !== "").length;

  const setField = (key: string, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
  };

  const handleApply = () => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v !== "") cleaned[k] = v;
    }
    onChange(cleaned);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setDraft({});
    onChange({});
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all",
            isOpen || activeCount > 0
              ? "border-indigo-600/50 bg-indigo-600/10 text-indigo-400"
              : "border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          )}
        >
          <IconAdjustments size={13} />
          Filtros de métrica
          {activeCount > 0 && (
            <span className="ml-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && !isOpen && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <IconX size={11} />
            Limpar
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {fields.map((field) => {
              const minKey = `min_${field.key}`;
              const maxKey = `max_${field.key}`;
              return (
                <div key={field.key} className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {field.label}
                    {field.prefix && (
                      <span className="ml-1 normal-case font-normal text-zinc-600">
                        {field.prefix}
                      </span>
                    )}
                    {field.suffix && (
                      <span className="ml-0.5 normal-case font-normal text-zinc-600">
                        {field.suffix}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-1">
                    <NumericInput
                      placeholder="Min"
                      value={draft[minKey] ?? ""}
                      onChange={(v) => setField(minKey, v)}
                    />
                    <span className="text-[10px] text-zinc-700 shrink-0">–</span>
                    <NumericInput
                      placeholder="Max"
                      value={draft[maxKey] ?? ""}
                      onChange={(v) => setField(maxKey, v)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
            <button
              onClick={handleClearAll}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              Limpar tudo
            </button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 text-xs text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
