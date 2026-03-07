"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { AiProfileSection } from "../_components/ai-profile-section";


export default function AiProfilePage() {
  const t = useTranslations("settings.nav");
  return (
    <SettingsSectionWrapper label={t("aiProfile")}>
      {(org) => (
        <AiProfileSection orgId={org.id} initialProfile={org.aiProfile} />
      )}
    </SettingsSectionWrapper>
  );
}
