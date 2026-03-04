"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { InstallationSection } from "../_components/installation-section";


export default function InstallationPage() {
  return (
    <SettingsSectionWrapper label="Instalação" hideCompleteness>
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
