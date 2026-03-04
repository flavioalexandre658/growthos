"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { NotificationsSection } from "../_components/notifications-section";


export default function NotificationsPage() {
  return (
    <SettingsSectionWrapper label="Notificações">
      {(org) => <NotificationsSection orgId={org.id} />}
    </SettingsSectionWrapper>
  );
}
