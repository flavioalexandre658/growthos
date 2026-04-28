"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  IconRadar,
  IconCheck,
  IconArrowRight,
  IconCode,
  IconCopy,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { checkEvents } from "@/actions/dashboard/check-events.action";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";

dayjs.extend(relativeTime);

interface StepVerifyEventProps {
  organizationId: string;
  apiKey: string;
  onComplete: (verified: boolean) => void;
}

export function StepVerifyEvent({
  organizationId,
  apiKey,
  onComplete,
}: StepVerifyEventProps) {
  const t = useTranslations("onboarding.stepVerifyEvent");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;
  const [hasFired, setHasFired] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const { data } = useQuery({
    queryKey: ["check-events-onboarding", organizationId],
    queryFn: async () => {
      const result = await checkEvents({ organizationId });
      if (result.count > 0 && !hasFired) {
        setHasFired(true);
        toast.success(t("firstEventToast"));
      }
      return result;
    },
    refetchInterval: hasFired ? false : 30_000,
  });

  const hasEvent = (data?.count ?? 0) > 0 || hasFired;
  const latest = data?.latestEvent;

  const curlCommand = `curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://..."}/api/track \\
  -H "Content-Type: application/json" \\
  -d '{"key":"${apiKey}","event_type":"pageview"}'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    toast.success(t("copiedToast"));
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border",
            hasEvent
              ? "bg-emerald-600/20 border-emerald-600/30"
              : "bg-zinc-800/50 border-zinc-700",
          )}
        >
          {hasEvent ? (
            <IconCheck size={18} className="text-emerald-400" />
          ) : (
            <IconRadar size={18} className="text-zinc-400" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">
            {hasEvent ? t("titleDetected") : t("titleWaiting")}
          </h2>
          <p className="text-xs text-zinc-500">
            {hasEvent
              ? t("subtitleDetected")
              : t("subtitleWaiting")}
          </p>
        </div>
      </div>

      {!hasEvent ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-2 border-indigo-600/30 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-2 border-indigo-600/50 flex items-center justify-center">
                <div className="h-5 w-5 rounded-full bg-indigo-600/60 animate-pulse" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
          </div>
          <p className="text-sm text-zinc-500 text-center">
            {t("waitingForEvents")}
          </p>
          <p className="text-xs text-zinc-600">
            {t("autoRefresh")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-600/20 border border-emerald-600/40 flex items-center justify-center">
              <IconCheck size={14} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-emerald-300">
              {t("trackerWorking")}
            </p>
          </div>
          {latest && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: t("eventLabels.event"), value: latest.eventType },
                { label: t("eventLabels.channel"), value: latest.source ?? "," },
                { label: t("eventLabels.page"), value: latest.landingPage ?? "," },
                { label: t("eventLabels.device"), value: latest.device ?? "," },
                {
                  label: t("eventLabels.received"),
                  value: dayjs(latest.createdAt).locale(dayjsLocale).fromNow(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-emerald-950/30 rounded-lg px-3 py-2"
                >
                  <p className="text-emerald-600 uppercase tracking-wider text-[10px] font-semibold">
                    {item.label}
                  </p>
                  <p className="text-emerald-200 font-mono mt-0.5 truncate">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasEvent && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {t("curlTestTitle")}
          </p>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <IconCode size={13} className="text-zinc-600" />
                <span className="text-[11px] font-mono text-zinc-500">
                  terminal
                </span>
              </div>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs transition-colors"
              >
                {copiedCurl ? (
                  <IconCheck size={12} className="text-emerald-400" />
                ) : (
                  <IconCopy size={12} />
                )}
                {t("copy")}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
              {curlCommand}
            </pre>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => onComplete(false)}
          className="flex-1 h-10 text-zinc-500 hover:text-zinc-300 border border-zinc-800 text-sm"
        >
          {t("skip")}
        </Button>
        <Button
          onClick={() => onComplete(true)}
          disabled={!hasEvent}
          className={cn(
            "flex-1 h-10 font-semibold gap-2 group",
            hasEvent
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
          )}
        >
          {t("submit")}
          <IconArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Button>
      </div>
    </div>
  );
}
