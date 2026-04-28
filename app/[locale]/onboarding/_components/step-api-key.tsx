"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { getTrackerSrc } from "@/utils/tracker-url";
import {
  IconKey,
  IconCopy,
  IconCheck,
  IconCode,
  IconArrowRight,
  IconLoader2,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { createApiKey } from "@/actions/api-keys/create-api-key.action";
import { AiPromptSection } from "@/app/[locale]/[slug]/settings/_components/ai-prompt-section";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

interface StepApiKeyProps {
  organizationId: string;
  organizationName: string;
  currency: string;
  hasRecurringRevenue: boolean;
  funnelSteps: IFunnelStepConfig[];
  existingKey?: string;
  onComplete: (apiKey: string) => void;
}

function CopyButton({ text }: { text: string }) {
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

function CodeBlock({
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
            <span className="text-[11px] font-mono text-zinc-500">{title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600 font-mono uppercase">
              {language}
            </span>
          </div>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function buildEventExample(step: IFunnelStepConfig, currency: string): string | null {
  const t = step.eventType.trim();
  if (!t) return null;

  if (step.countUnique || t === "pageview") {
    return `// '${t}' is auto-tracked by the tracker\n// No manual call needed`;
  }

  const examples: Record<string, string> = {
    purchase: `window.Groware.track('purchase', {\n  dedupe: invoice.id,           // REQUIRED: unique transaction ID\n  gross_value: 150.00,          // required\n  currency: '${currency}',           // always required\n  customer_id: user.id,         // REQUIRED — 400 if missing\n  discount: 10.00,              // optional: applied discount\n  payment_method: 'pix',        // pix | credit_card | boleto\n  product_id: 'produto-001',    // optional but recommended\n  category: 'principal',        // optional\n  customer_type: 'new',         // new | returning\n})`,
    signup: `window.Groware.track('signup', {\n  dedupe: true,                 // 1 signup per session (24h)\n  customer_id: user.id,         // REQUIRED — 400 if missing\n  customer_type: 'new',         // new | returning\n  // auto context: source, medium, device, landing_page\n})`,
    trial_started: `window.Groware.track('trial_started', {\n  dedupe: true,                 // 1 trial per session (24h)\n  customer_id: user.id,         // REQUIRED — 400 if missing\n  plan_id: 'plano-pro',\n  plan_name: 'Pro Mensal',\n  // auto context: source, medium, device\n})`,
    checkout_started: `window.Groware.track('checkout_started', {\n  gross_value: 89.00,\n  currency: '${currency}',\n  product_id: 'produto-001',\n  customer_id: user.id,\n  // abandonment auto-detected on beforeunload\n})`,
    checkout_abandoned: `window.Groware.track('checkout_abandoned', {\n  gross_value: 89.00,\n  currency: '${currency}',\n  product_id: 'produto-001',\n  reason: 'exit',  // exit | payment_failed | timeout\n})`,
  };

  if (examples[t]) return examples[t];

  return `window.Groware.track('${t}', {\n  product_id: /* resource ID */,\n  customer_id: user.id, // NEVER email or CPF\n})`;
}

export function StepApiKey({
  organizationId,
  organizationName,
  currency,
  hasRecurringRevenue,
  funnelSteps,
  existingKey,
  onComplete,
}: StepApiKeyProps) {
  const t = useTranslations("onboarding.stepApiKey");
  const [apiKey, setApiKey] = useState<string | null>(existingKey ?? null);
  const [isGenerating, setIsGenerating] = useState(!existingKey);
  const [baseUrl] = useState(
    typeof window !== "undefined"
      ? window.location.origin
      : "https://groware.io",
  );
  const [copied, setCopied] = useState(false);
  const hasGeneratedRef = useRef(false);

  useEffect(() => {
    if (existingKey || hasGeneratedRef.current) return;
    hasGeneratedRef.current = true;

    async function generate() {
      try {
        const [result] = await createApiKey({
          organizationId,
          name: `${organizationName}, Default`,
          expiresDays: undefined,
        });
        setApiKey(result.key);
      } catch {
        toast.error(t("generateErrorToast"));
      } finally {
        setIsGenerating(false);
      }
    }
    generate();
  }, [organizationId, organizationName, existingKey, t]);

  const snippet = apiKey
    ? `<script async src="${getTrackerSrc(baseUrl)}" data-key="${apiKey}"></script>`
    : "";

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success(t("apiKeyCopiedToast"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/20 border border-amber-600/30">
          <IconKey size={18} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">
            {t("title")}
          </h2>
          <p className="text-xs text-zinc-500">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {t("yourApiKey")}
        </p>

        {isGenerating ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <IconLoader2 size={16} className="animate-spin" />
            {t("generatingKey")}
          </div>
        ) : apiKey ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-indigo-300 bg-zinc-950 px-3 py-2.5 rounded-lg border border-zinc-800 overflow-hidden text-ellipsis whitespace-nowrap">
              {apiKey}
            </code>
            <button
              onClick={copyKey}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs transition-colors shrink-0"
            >
              {copied ? (
                <IconCheck size={13} className="text-emerald-400" />
              ) : (
                <IconCopy size={13} />
              )}
            </button>
          </div>
        ) : (
          <p className="text-xs text-red-400">{t("generateError")}</p>
        )}

        <div className="rounded-md bg-amber-900/20 border border-amber-800/30 px-3 py-2">
          <p className="text-[11px] text-amber-400">
            {t("keyWarning", { orgName: organizationName })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {apiKey && (
          <CodeBlock title="index.html" language="html" code={snippet} />
        )}

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          {t("snippetHint")}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t("identifyTitle")}
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          {t("identifyDescription")}
        </p>
        <CodeBlock
          title="app.js"
          language="js"
          code={`// Após o login do usuário:\nwindow.Groware.identify(user.id, {\n  name: user.name,\n  email: user.email,\n  phone: user.phone, // opcional\n})\n\n// No logout:\nwindow.Groware.reset()`}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t("trackFunnelTitle")}
          </p>
          <span className="text-[10px] text-zinc-600 font-mono">
            {t("stepsConfigured", { count: funnelSteps.length })}
          </span>
        </div>

        {funnelSteps.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex items-start gap-2">
            <IconInfoCircle
              size={14}
              className="text-zinc-600 mt-0.5 shrink-0"
            />
            <p className="text-xs text-zinc-500">
              {t("noStepsConfigured")}
            </p>
          </div>
        ) : (
          funnelSteps.map((step, idx) => {
            const example = buildEventExample(step, currency);
            const isAutoTracked =
              step.countUnique === true ||
              step.eventType === "pageview" ||
              step.eventType === "";
            if (!example) return null;
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {step.label}
                  </span>
                  {isAutoTracked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800/40 font-mono">
                      auto
                    </span>
                  )}
                </div>
                <CodeBlock
                  title={step.eventType || "custom"}
                  language="js"
                  code={example}
                />
              </div>
            );
          })
        )}
      </div>

      {funnelSteps.some((s) => s.eventType === "purchase") &&
        !funnelSteps.some((s) => s.eventType === "checkout_started") && (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-3 flex items-start gap-2.5">
            <IconInfoCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-300">
                {t("optionalEvent.title")}
              </p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {t("optionalEvent.description")}
              </p>
            </div>
          </div>
        )}

      {apiKey && (
        <AiPromptSection
          apiKey={apiKey}
          baseUrl={baseUrl}
          orgName={organizationName}
          currency={currency}
          funnelSteps={funnelSteps}
          hasRecurringRevenue={hasRecurringRevenue}
        />
      )}

      <Button
        onClick={() => apiKey && onComplete(apiKey)}
        disabled={isGenerating || !apiKey}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
      >
        {t("submit")}
        <IconArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Button>
    </div>
  );
}
