"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { PublicPageSection } from "../_components/public-page-section";

export default function PublicPageSettingsPage() {
  const t = useTranslations("settings.nav");
  return (
    <SettingsSectionWrapper label={t("publicPage")}>
      {(org) => <PublicPageSection org={org} />}
    </SettingsSectionWrapper>
  );
}
