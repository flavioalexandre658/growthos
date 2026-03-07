"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { FunnelStepsSection } from "../_components/funnel-steps-section";


export default function FunnelPage() {
  const t = useTranslations("settings.nav");
  return (
    <SettingsSectionWrapper label={t("funnel")}>
      {(org) => (
        <FunnelStepsSection orgId={org.id} initialSteps={org.funnelSteps} />
      )}
    </SettingsSectionWrapper>
  );
}
