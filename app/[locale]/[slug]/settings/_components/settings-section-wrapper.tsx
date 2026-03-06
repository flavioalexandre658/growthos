"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/components/providers/organization-provider";
import { SettingsCompleteness } from "./settings-completeness";
import type { IOrganization } from "@/interfaces/organization.interface";

interface SettingsSectionWrapperProps {
  label: string;
  hideCompleteness?: boolean;
  children: (org: IOrganization) => React.ReactNode;
}

export function SettingsSectionWrapper({
  label,
  hideCompleteness = false,
  children,
}: SettingsSectionWrapperProps) {
  const { organization, isLoading } = useOrganization();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl bg-zinc-800" />
        <Skeleton className="h-48 w-full rounded-xl bg-zinc-800" />
      </div>
    );
  }

  if (!organization) {
    return (
      <p className="text-center py-8 text-zinc-600 text-sm">
        Organização não encontrada.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {!hideCompleteness && (
        <SettingsCompleteness organization={organization} slug={slug} />
      )}
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">
          {label}
        </p>
        {children(organization)}
      </div>
    </div>
  );
}
