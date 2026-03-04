"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { TeamSection } from "../_components/team-section";


export default function TeamPage() {
  return (
    <SettingsSectionWrapper label="Equipe">
      {(org) => <TeamSection orgId={org.id} />}
    </SettingsSectionWrapper>
  );
}
