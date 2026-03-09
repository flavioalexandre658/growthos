"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  IconArrowLeft,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconClock,
} from "@tabler/icons-react";
import { formatDate } from "@/utils/format-date";
import { fmtBRLDecimal } from "@/utils/format";
import { useOrganization } from "@/components/providers/organization-provider";
import { useCustomerSummary } from "@/hooks/queries/use-customer-summary";
import type { ICustomerSummary } from "@/actions/customers/get-customer-summary.action";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerTimeline } from "../../../events/_components/customer-timeline";

interface CustomerDetailContentProps {
  customerId: string;
}

function AcquisitionCard({ summary }: {
  summary: ICustomerSummary;
}) {
  const ta = useTranslations("customers.detail.acquisition");
  const { organization } = useOrganization();
  const timezone = organization?.timezone ?? "America/Sao_Paulo";
  const { acquisition } = summary;
  const hasData =
    acquisition.source || acquisition.medium || acquisition.campaign || acquisition.landingPage;

  if (!hasData) {
    return (
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4">
        <h3 className="text-xs font-semibold text-zinc-400 mb-3">{ta("title")}</h3>
        <p className="text-xs text-zinc-600 italic">{ta("noData")}</p>
      </div>
    );
  }

  const fields = [
    { label: ta("source"), value: acquisition.source },
    { label: ta("medium"), value: acquisition.medium },
    { label: ta("campaign"), value: acquisition.campaign },
    { label: ta("landingPage"), value: acquisition.landingPage },
    { label: ta("device"), value: acquisition.device },
    acquisition.firstEventAt
      ? { label: ta("firstEventAt"), value: formatDate(acquisition.firstEventAt, timezone, "DD/MM/YYYY HH:mm") }
      : null,
  ].filter(Boolean) as { label: string; value: string | null }[];

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/40">
        <h3 className="text-xs font-semibold text-zinc-400">{ta("title")}</h3>
      </div>
      <div className="divide-y divide-zinc-800/30">
        {fields.filter((f) => f.value).map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 shrink-0">
              {f.label}
            </span>
            <span className="text-xs text-zinc-300 truncate text-right max-w-[220px]">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerDetailContent({ customerId }: CustomerDetailContentProps) {
  const t = useTranslations("customers");
  const tDetail = useTranslations("customers.detail");
  const { organization } = useOrganization();
  const slug = organization?.slug ?? "";
  const orgId = organization?.id ?? "";
  const timezone = organization?.timezone ?? "America/Sao_Paulo";

  const { data: summary, isLoading } = useCustomerSummary(orgId, customerId);

  const INTERVAL_LABELS: Record<string, string> = {
    monthly: t("intervals.monthly"),
    quarterly: t("intervals.quarterly"),
    semiannual: t("intervals.semiannual"),
    yearly: t("intervals.yearly"),
    weekly: t("intervals.weekly"),
  };

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/${slug}/customers`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <IconArrowLeft size={13} />
          {tDetail("backToList")}
        </Link>

        {isLoading ? (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3.5 w-64" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>
        ) : summary ? (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 text-xl font-bold ${
                summary.customer.name ? "bg-violet-500/15 text-violet-400" : "bg-zinc-800 text-zinc-600"
              }`}>
                {summary.customer.name ? summary.customer.name.charAt(0).toUpperCase() : <IconUser size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-zinc-100">
                  {summary.customer.name ?? tDetail("unknownCustomer")}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  {summary.customer.email && (
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <IconMail size={11} className="text-zinc-600" />
                      {summary.customer.email}
                    </span>
                  )}
                  {summary.customer.phone && (
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <IconPhone size={11} className="text-zinc-600" />
                      {summary.customer.phone}
                    </span>
                  )}
                  {(summary.customer.city || summary.customer.country) && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <IconMapPin size={11} className="text-zinc-600" />
                      {[summary.customer.city, summary.customer.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <IconClock size={11} className="text-zinc-600" />
                    {tDetail("lastSeen")}: {formatDate(summary.customer.lastSeenAt, timezone, "DD/MM/YY HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              {tDetail("kpi.ltv")}
            </p>
            <p className="text-lg font-bold text-emerald-400 font-mono">
              {fmtBRLDecimal(summary.ltvInCents / 100)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              {tDetail("kpi.payments")}
            </p>
            <p className="text-lg font-bold text-zinc-200">
              {summary.paymentsCount}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              {tDetail("kpi.subscription")}
            </p>
            {summary.activeSubscription ? (
              <div>
                <p className="text-sm font-semibold text-zinc-200 truncate">
                  {summary.activeSubscription.planName}
                </p>
                <p className="text-xs font-mono text-emerald-400">
                  {fmtBRLDecimal(summary.activeSubscription.valueInCents / 100)}
                  <span className="text-zinc-600 font-sans ml-1">
                    / {INTERVAL_LABELS[summary.activeSubscription.billingInterval] ?? summary.activeSubscription.billingInterval}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 italic">{tDetail("subscription.noSubscription")}</p>
            )}
          </div>
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              {tDetail("kpi.customerSince")}
            </p>
            <p className="text-sm font-semibold text-zinc-300">
              {formatDate(summary.customer.firstSeenAt, timezone, "DD/MM/YYYY")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-36 rounded-lg" />
          </>
        ) : summary ? (
          <>
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800/40">
                <h3 className="text-xs font-semibold text-zinc-400">{tDetail("subscription.title")}</h3>
              </div>
              {summary.activeSubscription ? (
                <div className="divide-y divide-zinc-800/30">
                  {[
                    { label: tDetail("subscription.plan"), value: summary.activeSubscription.planName },
                    { label: tDetail("subscription.value"), value: fmtBRLDecimal(summary.activeSubscription.valueInCents / 100) },
                    { label: tDetail("subscription.interval"), value: INTERVAL_LABELS[summary.activeSubscription.billingInterval] ?? summary.activeSubscription.billingInterval },
                    { label: tDetail("subscription.since"), value: formatDate(summary.activeSubscription.startedAt, timezone, "DD/MM/YYYY") },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{f.label}</span>
                      <span className="text-xs text-zinc-300">{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-zinc-600 italic">{tDetail("subscription.noSubscription")}</p>
                </div>
              )}
            </div>
            <AcquisitionCard summary={summary} />
          </>
        ) : null}
      </div>

      {orgId && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4">
          <h3 className="text-xs font-semibold text-zinc-400 mb-1">{tDetail("timeline.title")}</h3>
          <CustomerTimeline
            organizationId={orgId}
            customerId={customerId}
            currentEventId=""
          />
        </div>
      )}
    </div>
  );
}
