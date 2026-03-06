"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { PublicPageSection } from "../_components/public-page-section";

export default function PublicPageSettingsPage() {
  return (
    <SettingsSectionWrapper label="Página Pública">
      {(org) => <PublicPageSection org={org} />}
    </SettingsSectionWrapper>
  );
}
