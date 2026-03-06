"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { AiProfileSection } from "../_components/ai-profile-section";


export default function AiProfilePage() {
  return (
    <SettingsSectionWrapper label="Perfil IA">
      {(org) => (
        <AiProfileSection orgId={org.id} initialProfile={org.aiProfile} />
      )}
    </SettingsSectionWrapper>
  );
}
