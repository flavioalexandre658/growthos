"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconCopy,
  IconCheck,
  IconAlertTriangle,
  IconWebhook,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveWebhookSecret } from "@/actions/integrations/save-webhook-secret.action";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface WebhookInstructionsProps {
  organizationId: string;
  integrationId: string;
  hasWebhookSecret: boolean;
  onSecretSaved: () => void;
}

const WEBHOOK_EVENTS = [
  "invoice.payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "invoice.payment_failed",
  "payment_intent.succeeded",
  "charge.refunded",
];

export function WebhookInstructions({
  organizationId,
  integrationId,
  hasWebhookSecret,
  onSecretSaved,
}: WebhookInstructionsProps) {
  const t = useTranslations("settings.integrations.webhook");
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/stripe/${integrationId}`
      : `/api/webhooks/stripe/${integrationId}`;

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveSecret = async () => {
    if (!webhookSecret.trim()) return;
    setIsSaving(true);
    try {
      await saveWebhookSecret(organizationId, integrationId, webhookSecret.trim());
      toast.success(t("successToast"));
      setWebhookSecret("");
      onSecretSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorToast"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5 overflow-hidden">
      <div className="flex items-center gap-2">
        <IconWebhook size={16} className="text-indigo-400 shrink-0" />
        <p className="text-sm font-medium text-zinc-200">{t("title")}</p>
        {hasWebhookSecret && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t("configured")}
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs text-zinc-400 overflow-hidden">
        <Step n={1} text={t("step1")} />
        <Step n={2}>
          <span>{t("step2PasteUrl")}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <code className="min-w-0 flex-1 block bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="shrink-0 h-8 px-2.5 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              {copiedUrl ? <IconCheck size={12} /> : <IconCopy size={12} />}
            </Button>
          </div>
        </Step>
        <Step n={3}>
          <span>{t("step3SelectEvents")}</span>
          <ul className="mt-1.5 space-y-1 font-mono text-zinc-500">
            {WEBHOOK_EVENTS.map((e) => (
              <li key={e} className="flex items-center gap-2 overflow-hidden">
                <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                <span className="truncate">{e}</span>
              </li>
            ))}
          </ul>
        </Step>
        <Step n={4} text={t("step4Copy")} />
        <Step n={5}>
          <span>{t("step5PasteSecret")}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
              className="flex-1 h-8 bg-zinc-950 border-zinc-700 text-zinc-300 font-mono text-xs"
            />
            <Button
              size="sm"
              onClick={handleSaveSecret}
              disabled={!webhookSecret.trim() || isSaving}
              className="shrink-0 h-8 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isSaving ? t("saving") : t("save")}
            </Button>
          </div>
        </Step>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
        <IconAlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80">
          {t("warningText")}
        </p>
      </div>
    </div>
  );
}

function Step({
  n,
  text,
  children,
}: {
  n: number;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 min-w-0">
      <span
        className={cn(
          "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
          "bg-zinc-800 text-zinc-400 border border-zinc-700",
        )}
      >
        {n}
      </span>
      <div className="flex-1 min-w-0 overflow-hidden pt-0.5">{text ?? children}</div>
    </div>
  );
}
