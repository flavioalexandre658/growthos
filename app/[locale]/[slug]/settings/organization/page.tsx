"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { OrganizationSection } from "../_components/organization-section";


export default function OrganizationPage() {
  const t = useTranslations("settings.nav");
  return (
    <SettingsSectionWrapper label={t("organization")} hideCompleteness>
      {(org) => <OrganizationSection organization={org} />}
    </SettingsSectionWrapper>
  );
}
