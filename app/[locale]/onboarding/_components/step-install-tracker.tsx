"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  IconKey,
  IconCopy,
  IconCheck,
  IconArrowRight,
  IconLoader2,
  IconRadar,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { createApiKey } from "@/actions/api-keys/create-api-key.action";
import { checkEvents } from "@/actions/dashboard/check-events.action";
import { completeOnboarding } from "@/actions/auth/complete-onboarding.action";
import { pushDataLayerEvent } from "@/utils/datalayer";
import { growareTrack } from "@/utils/groware";
import { SdkGrid } from "./sdk-grid";
import { SdkTutorialDialog } from "./sdk-tutorial-dialog";
import type { SdkDefinition } from "./sdk-data";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";

dayjs.extend(relativeTime);

interface StepInstallTrackerProps {
  organizationId: string;
  organizationName: string;
  slug: string;
  currency: string;
  hasRecurringRevenue: boolean;
  funnelSteps: IFunnelStepConfig[];
  existingKey?: string;
}

export function StepInstallTracker({
  organizationId,
  organizationName,
  slug,
  currency,
  hasRecurringRevenue,
  funnelSteps,
  existingKey,
}: StepInstallTrackerProps) {
  const t = useTranslations("onboarding.stepInstallTracker");
  const tKey = useTranslations("onboarding.stepApiKey");
  const tVerify = useTranslations("onboarding.stepVerifyEvent");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;
  const { update, data: session } = useSession();

  const [apiKey, setApiKey] = useState<string | null>(existingKey ?? null);
  const [isGenerating, setIsGenerating] = useState(!existingKey);
  const [baseUrl] = useState(
    typeof window !== "undefined"
      ? window.location.origin
      : "https://groware.io",
  );
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [hasFired, setHasFired] = useState(false);
  const hasGeneratedRef = useRef(false);

  const [selectedSdk, setSelectedSdk] = useState<SdkDefinition | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

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
        toast.error(tKey("generateErrorToast"));
      } finally {
        setIsGenerating(false);
      }
    }
    generate();
  }, [organizationId, organizationName, existingKey, tKey]);

  const { data: eventData } = useQuery({
    queryKey: ["check-events-onboarding", organizationId],
    queryFn: async () => {
      const result = await checkEvents({ organizationId });
      if (result.count > 0 && !hasFired) {
        setHasFired(true);
        toast.success(tVerify("firstEventToast"));
        pushDataLayerEvent("TrackerInstalled");
        growareTrack("tracker", {
          product_id: organizationId,
          customer_id: session?.user?.id,
        });
      }
      return result;
    },
    refetchInterval: hasFired ? false : 3000,
    enabled: !!apiKey,
  });

  const hasEvent = (eventData?.count ?? 0) > 0 || hasFired;
  const latest = eventData?.latestEvent;

  const curlCommand = apiKey
    ? `curl -X POST ${baseUrl}/api/track \\\n  -H "Content-Type: application/json" \\\n  -d '{"key":"${apiKey}","event_type":"pageview"}'`
    : "";

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.success(tKey("apiKeyCopiedToast"));
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    toast.success(tVerify("copiedToast"));
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleSdkSelect = (sdk: SdkDefinition) => {
    setSelectedSdk(sdk);
    setTutorialOpen(true);
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await completeOnboarding();
      pushDataLayerEvent("OnboardingCompleted");
      growareTrack("onboarding", {
        product_id: organizationId,
        customer_id: session?.user?.id,
      });
      await update({ onboardingCompleted: true });
      toast.success(t("welcomeToast"));
      window.location.href = slug ? `/${slug}` : "/organizations";
    } catch {
      toast.error(t("errorToast"));
      setIsFinishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/20 border border-amber-600/30">
          <IconKey size={18} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{t("title")}</h2>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {tKey("yourApiKey")}
        </p>

        {isGenerating ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <IconLoader2 size={16} className="animate-spin" />
            {tKey("generatingKey")}
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
              {copiedKey ? (
                <IconCheck size={13} className="text-emerald-400" />
              ) : (
                <IconCopy size={13} />
              )}
            </button>
          </div>
        ) : (
          <p className="text-xs text-red-400">{tKey("generateError")}</p>
        )}

        <div className="rounded-md bg-amber-900/20 border border-amber-800/30 px-3 py-2">
          <p className="text-[11px] text-amber-400">
            {tKey("keyWarning", { orgName: organizationName })}
          </p>
        </div>
      </div>

      {apiKey && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {t("sdkGridTitle")}
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {t("sdkGridDescription")}
            </p>
          </div>

          <SdkGrid onSelect={handleSdkSelect} />

          <SdkTutorialDialog
            sdk={selectedSdk}
            open={tutorialOpen}
            onOpenChange={setTutorialOpen}
            apiKey={apiKey}
            baseUrl={baseUrl}
            orgName={organizationName}
            currency={currency}
            funnelSteps={funnelSteps}
            hasRecurringRevenue={hasRecurringRevenue}
          />
        </>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              hasEvent
                ? "bg-emerald-600/20 border-emerald-600/30"
                : "bg-zinc-800/50 border-zinc-700"
            }`}
          >
            {hasEvent ? (
              <IconCheck size={15} className="text-emerald-400" />
            ) : (
              <IconRadar size={15} className="text-zinc-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {hasEvent
                ? tVerify("titleDetected")
                : tVerify("titleWaiting")}
            </p>
            <p className="text-[11px] text-zinc-500">
              {hasEvent
                ? tVerify("subtitleDetected")
                : tVerify("autoRefresh")}
            </p>
          </div>
        </div>

        {hasEvent && latest ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: tVerify("eventLabels.event"), value: latest.eventType },
              {
                label: tVerify("eventLabels.channel"),
                value: latest.source ?? "-",
              },
              {
                label: tVerify("eventLabels.page"),
                value: latest.landingPage ?? "-",
              },
              {
                label: tVerify("eventLabels.device"),
                value: latest.device ?? "-",
              },
              {
                label: tVerify("eventLabels.received"),
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
        ) : !hasEvent && apiKey ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-indigo-600/30 flex items-center justify-center">
                <div className="h-7 w-7 rounded-full border-2 border-indigo-600/50 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-indigo-600/60 animate-pulse" />
                </div>
              </div>
              <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
            </div>
            <p className="text-xs text-zinc-500">{tVerify("waitingForEvents")}</p>
          </div>
        ) : null}

        {!hasEvent && apiKey && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
              {tVerify("curlTestTitle")}
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] font-mono text-zinc-600">
                  terminal
                </span>
                <button
                  onClick={copyCurl}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-[10px] transition-colors"
                >
                  {copiedCurl ? (
                    <IconCheck size={10} className="text-emerald-400" />
                  ) : (
                    <IconCopy size={10} />
                  )}
                  {tVerify("copy")}
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
                {curlCommand}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!hasEvent && (
          <Button
            variant="ghost"
            onClick={handleFinish}
            disabled={isGenerating || !apiKey || isFinishing}
            className="h-11 text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 font-medium"
          >
            {t("skipNow")}
          </Button>
        )}

        <Button
          onClick={handleFinish}
          disabled={isGenerating || !apiKey || isFinishing}
          className={`flex-1 h-11 font-semibold gap-2 group ${
            hasEvent
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {isFinishing ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              {t("finishing")}
            </>
          ) : (
            <>
              {hasEvent ? (
                <IconLayoutDashboard size={16} />
              ) : (
                <IconArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              )}
              {t("goToDashboard")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
