"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { StripeConnectCard } from "./_components/stripe-connect-card";
import { ComingSoonProviders } from "./_components/coming-soon-providers";

export default function IntegrationsPage() {
  const t = useTranslations("settings.nav");
  return (
    <SettingsSectionWrapper label={t("integrations")} hideCompleteness>
      {(org) => (
        <div className="space-y-6">
          <StripeConnectCard organizationId={org.id} />
          <ComingSoonProviders />
        </div>
      )}
    </SettingsSectionWrapper>
  );
}
