"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  IconSparkles,
  IconCopy,
  IconCheck,
  IconCode,
  IconInfoCircle,
  IconExternalLink,
  IconX,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSdkPrompt, getTutorialSteps, type SdkDefinition, type StepBadge } from "./sdk-data";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";
import type { IFunnelStep } from "@/interfaces/organization.interface";

interface SdkTutorialDialogProps {
  sdk: SdkDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  baseUrl: string;
  orgName: string;
  currency: string;
  funnelSteps: IFunnelStepConfig[];
  hasRecurringRevenue: boolean;
}

const BADGE_STYLES: Record<StepBadge, { label: string; className: string }> = {
  required: {
    label: "required",
    className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  recommended: {
    label: "recommended",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  optional: {
    label: "optional",
    className: "bg-zinc-700/60 text-zinc-400 border-zinc-600/40",
  },
};

function StepBadgePill({ badge, t }: { badge: StepBadge; t: (key: string) => string }) {
  const style = BADGE_STYLES[badge];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border tracking-wide uppercase",
        style.className,
      )}
    >
      {t(`badges.${badge}`)}
    </span>
  );
}

function TutorialCopyButton({ text }: { text: string }) {
  const t = useTranslations("onboarding.stepApiKey");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t("copiedToast"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs transition-colors"
    >
      {copied ? (
        <IconCheck size={12} className="text-emerald-400" />
      ) : (
        <IconCopy size={12} />
      )}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

function TutorialCodeBlock({
  title,
  language,
  code,
}: {
  title?: string;
  language: string;
  code: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <IconCode size={13} className="text-zinc-600" />
            <span className="text-[11px] font-mono text-zinc-500">
              {title}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600 font-mono uppercase">
              {language}
            </span>
          </div>
          <TutorialCopyButton text={code} />
        </div>
      )}
      <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function Callout({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-blue-500/20 bg-blue-950/10 px-4 py-3">
      <IconInfoCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xs font-semibold text-blue-300">{title}</p>
        <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
          {body}
        </p>
      </div>
    </div>
  );
}

export function SdkTutorialDialog({
  sdk,
  open,
  onOpenChange,
  apiKey,
  baseUrl,
  orgName,
  currency,
  funnelSteps,
  hasRecurringRevenue,
}: SdkTutorialDialogProps) {
  const t = useTranslations("onboarding.stepInstallTracker.tutorial");
  const [promptCopied, setPromptCopied] = useState(false);

  const funnelStepsForPrompt: IFunnelStep[] = funnelSteps.map((s) => ({
    ...s,
    hidden: false,
  }));

  const prompt = useMemo(
    () =>
      sdk
        ? buildSdkPrompt(sdk.id, {
            apiKey,
            baseUrl,
            orgName,
            currency,
            funnelSteps: funnelStepsForPrompt,
            hasRecurringRevenue,
          })
        : "",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sdk?.id, apiKey, baseUrl, orgName, currency, hasRecurringRevenue],
  );

  const tutorialSteps = useMemo(
    () => (sdk ? getTutorialSteps(sdk.id, { apiKey, baseUrl }) : []),
    [sdk, apiKey, baseUrl],
  );

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    toast.success(t("promptCopied"));
    setTimeout(() => setPromptCopied(false), 2500);
  };

  if (!sdk) return null;

  const Icon = sdk.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full border-zinc-800 bg-zinc-950 p-0 gap-0 flex flex-col max-h-[90vh] [&>button]:hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-800 shrink-0 flex flex-row items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700">
              <Icon size={22} className="text-zinc-300" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                {t("title", { sdk: sdk.name })}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                {sdk.category === "web"
                  ? t("descriptionWeb")
                  : t("descriptionServer")}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0 mt-0.5"
          >
            <IconX size={16} />
          </button>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/30 shrink-0 mt-0.5">
                  <IconSparkles size={14} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    {t("aiPromptTitle")}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    {t("aiPromptDescription")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleCopyPrompt}
                className={cn(
                  "shrink-0 h-8 gap-1.5 text-xs font-semibold transition-all",
                  promptCopied
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white",
                )}
              >
                {promptCopied ? (
                  <IconCheck size={13} />
                ) : (
                  <IconCopy size={13} />
                )}
                {promptCopied ? t("copied") : t("copyPrompt")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t("manualTitle")}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
              {(["required", "recommended", "optional"] as StepBadge[]).map(
                (b) => (
                  <span key={b} className="flex items-center gap-1.5">
                    <StepBadgePill badge={b} t={t} />
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="space-y-5">
            {tutorialSteps.map((step, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden"
              >
                <div className="flex items-start gap-3 px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-600/30 text-[11px] font-bold text-indigo-400 shrink-0 mt-px">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100">
                        {step.title}
                      </span>
                      {step.badge && (
                        <StepBadgePill badge={step.badge} t={t} />
                      )}
                    </div>
                    {step.description && (
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {step.code && step.language && (
                    <TutorialCodeBlock
                      title={step.file}
                      language={step.language}
                      code={step.code}
                    />
                  )}
                  {step.callout && (
                    <Callout
                      title={step.callout.title}
                      body={step.callout.body}
                    />
                  )}
                  {!step.code && !step.callout && step.description && null}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <IconExternalLink
                size={14}
                className="text-zinc-500 mt-0.5 shrink-0"
              />
              <p className="text-xs text-zinc-500 leading-relaxed">
                {t("docsHint")}{" "}
                <a
                  href={`${baseUrl}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  {t("docsLink")}
                </a>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
