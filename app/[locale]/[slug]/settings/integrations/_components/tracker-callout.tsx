"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { IconInfoCircle, IconX } from "@tabler/icons-react";

const DISMISS_KEY = "groware_tracker_callout_dismissed";

export function TrackerCallout() {
  const t = useTranslations("settings.integrations.common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <IconInfoCircle size={15} className="text-zinc-500 shrink-0" />
      <p className="flex-1 text-xs text-zinc-500 leading-relaxed">
        {t("trackerCallout")}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
        aria-label={t("trackerCalloutDismiss")}
      >
        <IconX size={14} />
      </button>
    </div>
  );
}
