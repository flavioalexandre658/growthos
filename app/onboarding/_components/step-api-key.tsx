"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
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
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

interface StepApiKeyProps {
  organizationId: string;
  organizationName: string;
  funnelSteps: IFunnelStepConfig[];
  existingKey?: string;
  onComplete: (apiKey: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
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
      {copied ? "Copiado" : "Copiar"}
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

function buildEventExample(step: IFunnelStepConfig): string | null {
  const t = step.eventType.trim();
  if (!t) return null;

  if (step.countUnique) {
    return `// '${t}' é rastreado automaticamente pelo tracker\n// Nenhuma chamada manual necessária`;
  }

  const examples: Record<string, string> = {
    payment: `window.GrowthOS.track('payment', {\n  gross_value: 150.00,\n  net_value: 140.00,\n  payment_method: 'pix',  // pix | cartao | boleto\n  product_id: 'produto-001',\n  category: 'principal',\n  customer_type: 'new',   // new | returning\n})`,
    signup: `window.GrowthOS.track('signup', {\n  // contexto automático: source, medium, device, landing_page\n})`,
    trial_started: `window.GrowthOS.track('trial_started', {\n  product_id: 'plano-pro',\n  // contexto automático: source, medium, device\n})`,
    checkout_started: `window.GrowthOS.track('checkout_started', {\n  gross_value: 89.00,\n  product_id: 'produto-001',\n  // abandono automático detectado no beforeunload\n})`,
    checkout_abandoned: `window.GrowthOS.track('checkout_abandoned', {\n  gross_value: 89.00,\n  product_id: 'produto-001',\n  reason: 'exit',  // exit | payment_failed | timeout\n})`,
    pageview: `// '${t}' é rastreado automaticamente pelo tracker\n// Nenhuma chamada manual necessária`,
  };

  if (examples[t]) return examples[t];

  return `window.GrowthOS.track('${t}', {\n  // adicione os campos relevantes para esta etapa\n})`;
}

export function StepApiKey({
  organizationId,
  organizationName,
  funnelSteps,
  existingKey,
  onComplete,
}: StepApiKeyProps) {
  const [apiKey, setApiKey] = useState<string | null>(existingKey ?? null);
  const [isGenerating, setIsGenerating] = useState(!existingKey);
  const [baseUrl, setBaseUrl] = useState(
    typeof window !== "undefined"
      ? window.location.origin
      : "https://growthos.dev",
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (existingKey) return;

    async function generate() {
      try {
        const [result] = await createApiKey({
          organizationId,
          name: `${organizationName}, Default`,
          expiresDays: undefined,
        });
        setApiKey(result.key);
      } catch {
        toast.error("Erro ao gerar API key. Tente novamente.");
      } finally {
        setIsGenerating(false);
      }
    }
    generate();
  }, [organizationId, organizationName, existingKey]);

  const snippet = apiKey
    ? `<script async src="${baseUrl}/tracker.js" data-key="${apiKey}"></script>`
    : "";

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copiada!");
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
            API key + Instalação
          </h2>
          <p className="text-xs text-zinc-500">
            Cole um script no seu site e os dados chegam automaticamente
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Sua API key
        </p>

        {isGenerating ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <IconLoader2 size={16} className="animate-spin" />
            Gerando chave...
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
          <p className="text-xs text-red-400">Erro ao gerar key.</p>
        )}

        <div className="rounded-md bg-amber-900/20 border border-amber-800/30 px-3 py-2">
          <p className="text-[11px] text-amber-400">
            Guarde esta chave em segurança. Ela autentica os eventos do seu
            site.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            URL base do GrowthOS
          </p>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 font-mono focus:border-indigo-500 focus:outline-none"
            placeholder="https://growthos.dev"
          />
        </div>

        {apiKey && (
          <CodeBlock title="index.html" language="html" code={snippet} />
        )}

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Cole no <code className="text-zinc-400">&lt;head&gt;</code> de
          qualquer página. O tracker captura UTMs, device, referrer e pageviews
          automaticamente.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Como rastrear seu funil
          </p>
          <span className="text-[10px] text-zinc-600 font-mono">
            {funnelSteps.length} etapa{funnelSteps.length !== 1 ? "s" : ""}{" "}
            configurada{funnelSteps.length !== 1 ? "s" : ""}
          </span>
        </div>

        {funnelSteps.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex items-start gap-2">
            <IconInfoCircle
              size={14}
              className="text-zinc-600 mt-0.5 shrink-0"
            />
            <p className="text-xs text-zinc-500">
              Nenhuma etapa de funil configurada. Volte ao passo anterior para
              definir seu funil.
            </p>
          </div>
        ) : (
          funnelSteps.map((step, idx) => {
            const example = buildEventExample(step);
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

      <Button
        onClick={() => apiKey && onComplete(apiKey)}
        disabled={isGenerating || !apiKey}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
      >
        Continuar
        <IconArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Button>
    </div>
  );
}
