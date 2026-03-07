"use client";

import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { NotificationsSection } from "../_components/notifications-section";


export default function NotificationsPage() {
  const t = useTranslations("settings.nav");
  return (
    <SettingsSectionWrapper label={t("notifications")}>
      {(org) => <NotificationsSection orgId={org.id} />}
    </SettingsSectionWrapper>
  );
}
