"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  IconFilter,
  IconPlus,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconArrowRight,
  IconGripVertical,
  IconSparkles,
  IconX,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUpdateFunnelSteps } from "@/hooks/mutations/use-update-funnel-steps";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

const PRESETS: { label: string; description: string; steps: IFunnelStepConfig[] }[] = [
  {
    label: "E-commerce",
    description: "pageview → signup → payment",
    steps: [
      { eventType: "pageview", label: "Visitas", countUnique: true },
      { eventType: "signup", label: "Cadastros" },
      { eventType: "payment", label: "Pagamentos" },
    ],
  },
  {
    label: "SaaS / Trial",
    description: "signup → trial → payment",
    steps: [
      { eventType: "signup", label: "Cadastros" },
      { eventType: "trial_started", label: "Trials" },
      { eventType: "payment", label: "Pagamentos" },
    ],
  },
  {
    label: "SaaS Recorrente",
    description: "signup → trial → payment → churn",
    steps: [
      { eventType: "signup", label: "Cadastros" },
      { eventType: "trial_started", label: "Trials" },
      { eventType: "payment", label: "Pagamentos" },
      { eventType: "subscription_canceled", label: "Churn" },
    ],
  },
  {
    label: "Simples",
    description: "signup → payment",
    steps: [
      { eventType: "signup", label: "Cadastros" },
      { eventType: "payment", label: "Pagamentos" },
    ],
  },
  {
    label: "Custom",
    description: "Configure do zero",
    steps: [],
  },
];

interface FunnelStepsSectionProps {
  orgId: string;
  initialSteps: IFunnelStepConfig[];
}

export function FunnelStepsSection({ orgId, initialSteps }: FunnelStepsSectionProps) {
  const [steps, setSteps] = useState<IFunnelStepConfig[]>(initialSteps);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const mutation = useUpdateFunnelSteps();

  const isDirty = useMemo(
    () => JSON.stringify(steps) !== JSON.stringify(initialSteps),
    [steps, initialSteps]
  );

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setActivePreset(preset.label);
    if (preset.steps.length > 0) {
      setSteps(preset.steps.map((s) => ({ ...s })));
    }
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { eventType: "", label: "", countUnique: false }]);
    setActivePreset("Custom");
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    setActivePreset("Custom");
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setActivePreset("Custom");
  };

  const updateStep = (index: number, field: keyof IFunnelStepConfig, value: string | boolean) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    setActivePreset("Custom");
  };

  const handleDiscard = () => {
    setSteps(initialSteps.map((s) => ({ ...s })));
    setActivePreset(null);
  };

  const handleSave = async () => {
    const valid = steps.every((s) => s.eventType.trim() && s.label.trim());
    if (!valid) {
      toast.error("Preencha todos os campos das etapas");
      return;
    }
    if (steps.length < 1) {
      toast.error("Adicione pelo menos 1 etapa ao funil");
      return;
    }

    const result = await mutation.mutateAsync({
      organizationId: orgId,
      funnelSteps: steps,
    });

    if (result) {
      toast.success("Funil atualizado com sucesso!");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-600/30 shrink-0">
            <IconFilter size={16} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Etapas do Funil</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Defina as etapas que você quer rastrear no seu funil de conversão
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={mutation.isPending}
              className="h-8 gap-1.5 text-xs text-zinc-500 hover:text-zinc-200"
            >
              <IconX size={13} />
              Descartar
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || mutation.isPending}
            className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
          >
            <IconDeviceFloppy size={13} />
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <IconSparkles size={12} className="text-zinc-500" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Presets
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  activePreset === preset.label
                    ? "border-indigo-600/50 bg-indigo-600/10"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-bold",
                    activePreset === preset.label ? "text-indigo-300" : "text-zinc-300"
                  )}
                >
                  {preset.label}
                </p>
                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <IconGripVertical size={12} className="text-zinc-500" />
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Etapas ({steps.length})
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[10px] text-zinc-700 font-mono pr-1">
              <span className="w-28 text-center">event_type</span>
              <span>label</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <div
                key={index}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border bg-zinc-950/60 p-2.5 transition-colors",
                  step.eventType && step.label
                    ? "border-zinc-800"
                    : "border-amber-900/40 bg-amber-950/10"
                )}
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveStep(index, "up")}
                    disabled={index === 0}
                    className="p-0.5 text-zinc-700 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                  >
                    <IconChevronUp size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(index, "down")}
                    disabled={index === steps.length - 1}
                    className="p-0.5 text-zinc-700 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                  >
                    <IconChevronDown size={11} />
                  </button>
                </div>

                <span className="text-[10px] font-mono text-zinc-700 w-4 text-center shrink-0 tabular-nums">
                  {index + 1}
                </span>

                <Input
                  value={step.eventType}
                  onChange={(e) => updateStep(index, "eventType", e.target.value)}
                  placeholder="event_type"
                  className="h-8 font-mono text-xs bg-zinc-900 border-zinc-700/80 text-indigo-300 placeholder:text-zinc-700 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600/50 w-36 shrink-0"
                />

                <Input
                  value={step.label}
                  onChange={(e) => updateStep(index, "label", e.target.value)}
                  placeholder="Label exibida"
                  className="h-8 text-xs bg-zinc-900 border-zinc-700/80 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600/50 flex-1 min-w-0"
                />

                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer group/cb">
                  <input
                    type="checkbox"
                    checked={step.countUnique ?? false}
                    onChange={(e) => updateStep(index, "countUnique", e.target.checked)}
                    className="accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-600 group-hover/cb:text-zinc-400 select-none hidden sm:inline transition-colors">
                    unique
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  disabled={steps.length <= 1}
                  className="p-1.5 text-zinc-700 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStep}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-indigo-400 transition-colors mt-2 pl-1"
          >
            <IconPlus size={13} />
            Adicionar etapa
          </button>
        </div>

        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3.5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-2.5">
            Preview do pipeline
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {steps.length === 0 ? (
              <span className="text-xs text-zinc-700 italic">Nenhuma etapa configurada</span>
            ) : (
              steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-indigo-300/80 bg-indigo-950/50 border border-indigo-900/50 px-2 py-0.5 rounded">
                      {step.eventType || "···"}
                    </span>
                    {step.countUnique && (
                      <span className="text-[9px] font-semibold text-violet-400/80 bg-violet-950/40 border border-violet-900/30 px-1 py-0.5 rounded">
                        U
                      </span>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <IconArrowRight size={12} className="text-zinc-700 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
          {steps.some((s) => s.countUnique) && (
            <p className="text-[10px] text-zinc-700 mt-2">
              <span className="font-mono text-violet-400/70">U</span> = conta sessões únicas
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
