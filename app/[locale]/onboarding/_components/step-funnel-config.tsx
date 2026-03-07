"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  IconFilter,
  IconLoader2,
  IconArrowRight,
  IconPlus,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateFunnelSteps } from "@/actions/organizations/update-funnel-steps.action";
import { cn } from "@/lib/utils";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

interface StepFunnelConfigProps {
  organizationId: string;
  onComplete: (steps: IFunnelStepConfig[]) => void;
}

export function StepFunnelConfig({ organizationId, onComplete }: StepFunnelConfigProps) {
  const t = useTranslations("onboarding.stepFunnelConfig");

  const PRESETS: { key: string; steps: IFunnelStepConfig[] }[] = [
    {
      key: "ecommerce",
      steps: [
        { eventType: "pageview", label: t("defaultStepLabels.visits"), countUnique: true },
        { eventType: "signup", label: t("defaultStepLabels.signups") },
        { eventType: "purchase", label: t("defaultStepLabels.purchases") },
      ],
    },
    {
      key: "saas",
      steps: [
        { eventType: "signup", label: t("defaultStepLabels.signups") },
        { eventType: "trial_started", label: t("defaultStepLabels.trials") },
        { eventType: "purchase", label: t("defaultStepLabels.purchases") },
      ],
    },
    {
      key: "saasRecurring",
      steps: [
        { eventType: "signup", label: t("defaultStepLabels.signups") },
        { eventType: "trial_started", label: t("defaultStepLabels.trials") },
        { eventType: "purchase", label: t("defaultStepLabels.purchases") },
        { eventType: "subscription_canceled", label: t("defaultStepLabels.churn") },
      ],
    },
    {
      key: "simple",
      steps: [
        { eventType: "signup", label: t("defaultStepLabels.signups") },
        { eventType: "purchase", label: t("defaultStepLabels.purchases") },
      ],
    },
    {
      key: "custom",
      steps: [],
    },
  ];

  const [steps, setSteps] = useState<IFunnelStepConfig[]>([
    { eventType: "signup", label: t("defaultStepLabels.signups") },
    { eventType: "purchase", label: t("defaultStepLabels.purchases") },
  ]);
  const [activePreset, setActivePreset] = useState("simple");
  const [isLoading, setIsLoading] = useState(false);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setActivePreset(preset.key);
    if (preset.steps.length > 0) {
      setSteps(preset.steps.map((s) => ({ ...s })));
    }
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { eventType: "", label: "", countUnique: false },
    ]);
    setActivePreset("custom");
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    setActivePreset("custom");
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setActivePreset("custom");
  };

  const updateStep = (
    index: number,
    field: keyof IFunnelStepConfig,
    value: string | boolean
  ) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setActivePreset("custom");
  };

  const handleSave = async () => {
    const valid = steps.every((s) => s.eventType.trim() && s.label.trim());
    if (!valid) {
      toast.error(t("validationFillAll"));
      return;
    }
    if (steps.length < 1) {
      toast.error(t("validationMinStep"));
      return;
    }
    setIsLoading(true);
    try {
      await updateFunnelSteps({ organizationId, funnelSteps: steps });
      toast.success(t("successToast"));
      onComplete(steps);
    } catch {
      toast.error(t("errorToast"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-600/30">
          <IconFilter size={18} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{t("title")}</h2>
          <p className="text-xs text-zinc-500">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
          {t("presetsLabel")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                activePreset === preset.key
                  ? "border-indigo-600/50 bg-indigo-600/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              )}
            >
              <p
                className={cn(
                  "text-xs font-bold",
                  activePreset === preset.key
                    ? "text-indigo-300"
                    : "text-zinc-300"
                )}
              >
                {t(`presets.${preset.key}.label`)}
              </p>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                {t(`presets.${preset.key}.description`)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
          {t("stepsLabel")}
        </p>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveStep(index, "up")}
                  disabled={index === 0}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20"
                >
                  <IconChevronUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, "down")}
                  disabled={index === steps.length - 1}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20"
                >
                  <IconChevronDown size={12} />
                </button>
              </div>

              <span className="text-[10px] font-mono text-zinc-600 w-4 text-center shrink-0">
                {index + 1}
              </span>

              <Input
                value={step.eventType}
                onChange={(e) => updateStep(index, "eventType", e.target.value)}
                placeholder="event_type"
                className="h-8 font-mono text-xs bg-zinc-950 border-zinc-700 text-indigo-300 placeholder:text-zinc-700 focus-visible:ring-indigo-500 w-36 shrink-0"
              />

              <Input
                value={step.label}
                onChange={(e) => updateStep(index, "label", e.target.value)}
                placeholder="Label"
                className="h-8 text-xs bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-indigo-500 flex-1 min-w-0"
              />

              <label className="flex items-center gap-1 shrink-0 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={step.countUnique ?? false}
                  onChange={(e) => updateStep(index, "countUnique", e.target.checked)}
                  className="accent-indigo-600 h-3.5 w-3.5"
                />
                <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 select-none">
                  unique
                </span>
              </label>

              <button
                type="button"
                onClick={() => removeStep(index)}
                disabled={steps.length <= 1}
                className="p-1 text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-20"
              >
                <IconTrash size={13} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-indigo-400 transition-colors mt-1"
        >
          <IconPlus size={13} />
          {t("addStep")}
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/20 p-3">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-2">
          {t("previewLabel")}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                {step.eventType || "..."}
              </span>
              {i < steps.length - 1 && (
                <span className="text-zinc-700 text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
      >
        {isLoading ? (
          <>
            <IconLoader2 size={16} className="animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            {t("submit")}
            <IconArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </>
        )}
      </Button>
    </div>
  );
}
