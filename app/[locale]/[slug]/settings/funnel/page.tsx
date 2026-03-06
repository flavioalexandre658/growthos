"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { FunnelStepsSection } from "../_components/funnel-steps-section";


export default function FunnelPage() {
  return (
    <SettingsSectionWrapper label="Funil">
      {(org) => (
        <FunnelStepsSection orgId={org.id} initialSteps={org.funnelSteps} />
      )}
    </SettingsSectionWrapper>
  );
}
