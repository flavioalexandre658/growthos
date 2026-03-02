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
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { createApiKey } from "@/actions/api-keys/create-api-key.action";

interface StepApiKeyProps {
  organizationId: string;
  organizationName: string;
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
      {copied ? <IconCheck size={12} className="text-emerald-400" /> : <IconCopy size={12} />}
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

export function StepApiKey({
  organizationId,
  organizationName,
  existingKey,
  onComplete,
}: StepApiKeyProps) {
  const [apiKey, setApiKey] = useState<string | null>(existingKey ?? null);
  const [isGenerating, setIsGenerating] = useState(!existingKey);
  const [baseUrl, setBaseUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : "https://seudominio.com"
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (existingKey) return;

    async function generate() {
      try {
        const [result] = await createApiKey({
          organizationId,
          name: `${organizationName} — Default`,
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
    ? `<script src="${baseUrl}/tracker.js" data-key="${apiKey}"></script>`
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
          <h2 className="text-lg font-bold text-zinc-100">API key + Instalação</h2>
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
            Guarde esta chave em segurança. Ela autentica os eventos do seu site.
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
            placeholder="https://seudominio.com"
          />
        </div>

        {apiKey && (
          <CodeBlock
            title="index.html"
            language="html"
            code={snippet}
          />
        )}

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Cole no <code className="text-zinc-400">&lt;head&gt;</code> de qualquer página.
          O tracker captura UTMs, device, referrer e pageviews automaticamente.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Eventos manuais (copie e use)
        </p>

        <CodeBlock
          title="payment"
          language="js"
          code={`window.GrowthOS.track('payment', {
  gross_value: 150.00,
  product_id: 'produto-001',
  payment_method: 'pix',
  customer_type: 'new',
})`}
        />

        <CodeBlock
          title="signup"
          language="js"
          code={`window.GrowthOS.track('signup', {})`}
        />
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
