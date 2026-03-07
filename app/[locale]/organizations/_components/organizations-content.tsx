"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  IconPlus,
  IconBuilding,
  IconLogout,
  IconChevronRight,
  IconCreditCard,
  IconAlertTriangle,
  IconArrowRight,
  IconEye,
  IconReceipt2,
  IconCode,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { GrowareLogo } from "@/components/groware-logo";
import { useBilling } from "@/hooks/queries/use-billing";
import { formatRevenueLimit } from "@/utils/plans";
import type { IOrgStats } from "@/actions/organizations/get-organizations-with-stats.action";
import type { IBillingData } from "@/actions/billing/get-billing.action";

const STORAGE_KEY = "groware_active_org";

const ORG_COLORS = ["#818cf8", "#3b82f6", "#34d399", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];

function formatCompact(cents: number): string {
  const val = cents / 100;
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(1)}k`;
  if (val > 0) return `R$ ${val.toFixed(0)}`;
  return "R$ 0";
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

interface OrganizationsContentProps {
  initialOrgs: IOrgStats[];
  initialBilling: IBillingData | null;
  userName: string | null | undefined;
  firstOrgSlug?: string | null;
}

function OrgCard({
  org,
  color,
  onSelect,
}: {
  org: IOrgStats;
  color: string;
  onSelect: () => void;
}) {
  const t = useTranslations("organizations");
  const initials = org.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-900 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      style={{ ["--org-color" as string]: color }}
    >
      <div className="flex w-full items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white ring-1 ring-white/10"
            style={{ background: `${color}30`, color }}
          >
            {initials}
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
            {org.name}
          </h3>
        </div>
        <IconChevronRight
          size={14}
          className="text-zinc-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400"
        />
      </div>

      {org.hasData ? (
        <div className="flex-1 space-y-3">
          <div>
            <span className="text-xl font-bold text-zinc-100 tracking-tight">
              {formatCompact(org.revenueThisMonthInCents)}
            </span>
            <span className="text-[11px] text-zinc-500 ml-1.5">{t("orgCard.revenuePerMonth")}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <IconEye size={12} className="text-zinc-600" />
              <span>{formatCount(org.pageviewsThisMonth)} {t("orgCard.visits")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IconReceipt2 size={12} className="text-zinc-600" />
              <span>{org.purchasesThisMonth} {t("orgCard.payments")}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-start gap-2">
          <span className="text-sm text-zinc-500">{t("orgCard.noDataYet")}</span>
          <span className="flex items-center gap-1 text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors">
            <IconCode size={12} />
            {t("orgCard.installTracker")}
          </span>
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0 h-px rounded-b-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
      />
    </button>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  const t = useTranslations("organizations");
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
        <IconBuilding size={28} className="text-zinc-500" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-zinc-100">
        {t("emptyState.title")}
      </h3>
      <p className="mb-8 max-w-sm text-sm text-zinc-500 leading-relaxed">
        {t("emptyState.description")}
      </p>
      <Button
        onClick={onCreateClick}
        className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        <IconPlus size={16} />
        {t("emptyState.createButton")}
      </Button>
    </div>
  );
}

export function OrganizationsContent({
  initialOrgs,
  initialBilling,
  userName,
  firstOrgSlug,
}: OrganizationsContentProps) {
  const t = useTranslations("organizations");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgs] = useState<IOrgStats[]>(initialOrgs);
  const { data: billing } = useBilling({ initialData: initialBilling });

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.push("/onboarding?new-org=1");
    }
  }, [searchParams, router]);

  const handleSelect = (slug: string) => {
    localStorage.setItem(STORAGE_KEY, slug);
    router.push(`/${slug}`);
  };

  const handleCreateNew = () => {
    router.push("/onboarding?new-org=1");
  };

  const atOrgLimit =
    billing &&
    billing.plan.maxOrgs !== Infinity &&
    billing.ownedOrgsCount >= billing.plan.maxOrgs;

  const settingsSlug = firstOrgSlug ?? orgs[0]?.slug;

  const totalRevenue = billing?.revenue?.totalInCents ?? 0;
  const revLimit = billing?.plan.maxRevenuePerMonthBrl ?? Infinity;
  const isOverRevLimit = revLimit !== Infinity && totalRevenue > revLimit;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-6 py-4 backdrop-blur-sm">
        <GrowareLogo size="sm" />

        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-xs text-zinc-500 sm:block">{userName}</span>
          )}
          {settingsSlug && (
            <Link
              href={`/${settingsSlug}/settings/billing`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <IconCreditCard size={14} />
              <span className="hidden sm:block">{t("header.plan")}</span>
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <IconLogout size={14} />
            {t("header.signOut")}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              Groware
            </p>
            <h1 className="text-2xl font-bold text-zinc-100">
              {t("content.title")}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              {t("content.subtitle")}
            </p>
          </div>

          {orgs.length > 0 && (
            <Button
              onClick={handleCreateNew}
              variant="outline"
              size="sm"
              disabled={!!atOrgLimit}
              title={atOrgLimit ? t("content.orgLimitTooltip", { maxOrgs: billing?.plan.maxOrgs }) : undefined}
              className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-indigo-500/50 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconPlus size={14} />
              {t("content.newOrganization")}
            </Button>
          )}
        </div>

        {orgs.length === 0 ? (
          <EmptyState onCreateClick={handleCreateNew} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org, i) => (
              <OrgCard
                key={org.id}
                org={org}
                color={ORG_COLORS[i % ORG_COLORS.length]}
                onSelect={() => handleSelect(org.slug)}
              />
            ))}

            {!atOrgLimit && (
              <button
                onClick={handleCreateNew}
                className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-transparent p-5 text-center transition-all duration-200 hover:border-indigo-500/50 hover:bg-zinc-900/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-600">
                  <IconPlus size={16} />
                </div>
                <p className="text-xs font-medium text-zinc-500">{t("content.newOrganization")}</p>
              </button>
            )}
          </div>
        )}

        {billing && orgs.length > 0 && (
          <div
            className={`mt-8 flex items-center justify-between rounded-xl border px-4 py-3 ${
              atOrgLimit || isOverRevLimit
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-zinc-800 bg-zinc-900/60"
            }`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              {(atOrgLimit || isOverRevLimit) ? (
                <IconAlertTriangle size={14} className="text-amber-400 shrink-0" />
              ) : (
                <IconCreditCard size={14} className="text-indigo-400 shrink-0" />
              )}
              <span className="text-xs text-zinc-400">
                {t("billingBar.plan")} <span className="font-medium text-zinc-200">{billing.plan.name}</span>
              </span>
              <span className="text-[10px] text-zinc-600">·</span>
              <span className="text-xs text-zinc-500">
                {formatCompact(totalRevenue)} / {formatRevenueLimit(revLimit)} {t("billingBar.revenue")}
              </span>
              <span className="text-[10px] text-zinc-600">·</span>
              <span className="text-xs text-zinc-500">
                {billing.ownedOrgsCount}/{billing.plan.maxOrgs === Infinity ? "∞" : billing.plan.maxOrgs} {t("billingBar.orgs")}
              </span>
            </div>
            {settingsSlug && (
              <Link
                href={`/${settingsSlug}/settings/billing`}
                className={`text-[11px] transition-colors flex items-center gap-1 shrink-0 ${
                  atOrgLimit || isOverRevLimit
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-indigo-400 hover:text-indigo-300"
                }`}
              >
                {atOrgLimit || isOverRevLimit ? t("billingBar.upgrade") : t("billingBar.details")}
                <IconArrowRight size={10} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
