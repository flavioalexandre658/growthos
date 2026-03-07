"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { InstallationSection } from "../_components/installation-section";


export default function InstallationPage() {
  const t = useTranslations("settings.nav");
  return (
    <SettingsSectionWrapper label={t("installation")} hideCompleteness>
      {(org) => (
        <InstallationSection
          orgId={org.id}
          orgName={org.name}
          currency={org.currency ?? "BRL"}
          funnelSteps={org.funnelSteps}
          hasRecurringRevenue={org.hasRecurringRevenue}
        />
      )}
    </SettingsSectionWrapper>
  );
}
