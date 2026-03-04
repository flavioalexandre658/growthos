"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { OrganizationSection } from "../_components/organization-section";


export default function OrganizationPage() {
  return (
    <SettingsSectionWrapper label="Organização" hideCompleteness>
      {(org) => <OrganizationSection organization={org} />}
    </SettingsSectionWrapper>
  );
}
