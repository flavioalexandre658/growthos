"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconBrain, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { updateAiProfile } from "@/actions/organizations/update-ai-profile.action";
import { useQueryClient } from "@tanstack/react-query";
import { getOrganizationsQueryKey } from "@/hooks/queries/use-organizations";
import toast from "react-hot-toast";
import type { IAiProfile } from "@/interfaces/ai.interface";

export function AiProfileSection({
  orgId,
  initialProfile,
}: {
  orgId: string;
  initialProfile?: IAiProfile;
}) {
  const t = useTranslations("settings.aiProfile");
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [segment, setSegment] = useState(initialProfile?.segment ?? "");
  const [model, setModel] = useState(initialProfile?.model ?? "");
  const [taxRegime, setTaxRegime] = useState(initialProfile?.taxRegime ?? "");
  const [monthlyGoal, setMonthlyGoal] = useState(
    initialProfile?.monthlyGoal ? String(initialProfile.monthlyGoal) : "",
  );

  const TAX_REGIMES = [
    { value: "", label: t("taxRegimeNone") },
    { value: "mei", label: t("taxRegimeMei") },
    { value: "simples_nacional", label: t("taxRegimeSimplesNacional") },
    { value: "lucro_presumido", label: t("taxRegimeLucroPresumido") },
    { value: "lucro_real", label: t("taxRegimeLucroReal") },
  ];

  const TAX_REGIME_DESCRIPTIONS: Record<string, string> = {
    "": t("taxDescNone"),
    mei: t("taxDescMei"),
    simples_nacional: t("taxDescSimplesNacional"),
    lucro_presumido: t("taxDescLucroPresumido"),
    lucro_real: t("taxDescLucroReal"),
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAiProfile({
        organizationId: orgId,
        segment: segment || undefined,
        model: model || undefined,
        taxRegime: taxRegime || undefined,
        monthlyGoal: monthlyGoal ? Number(monthlyGoal) : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: getOrganizationsQueryKey() });
      toast.success(t("successToast"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20">
          <IconBrain size={14} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              {t("segmentLabel")}
            </label>
            <input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder={t("segmentPlaceholder")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              {t("modelLabel")}
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("modelPlaceholder")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              {t("taxRegimeLabel")}
            </label>
            <select
              value={taxRegime}
              onChange={(e) => setTaxRegime(e.target.value)}
              className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              {TAX_REGIMES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {TAX_REGIME_DESCRIPTIONS[taxRegime] && (
              <div className="flex items-start gap-1.5">
                <IconInfoCircle size={12} className="text-zinc-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {TAX_REGIME_DESCRIPTIONS[taxRegime]}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              {t("monthlyGoalLabel")}
            </label>
            <input
              type="number"
              value={monthlyGoal}
              onChange={(e) => setMonthlyGoal(e.target.value)}
              placeholder={t("monthlyGoalPlaceholder")}
              min="0"
              step="100"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          {t("footerHint")}
        </p>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5 text-xs"
          >
            {saving ? (
              t("saving")
            ) : (
              <>
                <IconCheck size={13} />
                {t("saveProfile")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
