"use client";

import { useState } from "react";
import { IconBrain, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { updateAiProfile } from "@/actions/organizations/update-ai-profile.action";
import { useQueryClient } from "@tanstack/react-query";
import { getOrganizationsQueryKey } from "@/hooks/queries/use-organizations";
import toast from "react-hot-toast";
import type { IAiProfile } from "@/interfaces/ai.interface";

const TAX_REGIMES = [
  { value: "", label: "Não informado" },
  { value: "mei", label: "MEI" },
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
];

const TAX_REGIME_DESCRIPTIONS: Record<string, string> = {
  "": "IA não considera impostos nas análises de rentabilidade",
  mei: "IA considera alíquota fixa de ~5% (DAS) nas recomendações de margem",
  simples_nacional: "IA considera alíquota de ~6% nas recomendações de margem",
  lucro_presumido: "IA considera alíquota de ~13,33% nas recomendações de margem",
  lucro_real: "IA considera alíquota variável — informe o contexto no segmento para mais precisão",
};

export function AiProfileSection({
  orgId,
  initialProfile,
}: {
  orgId: string;
  initialProfile?: IAiProfile;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [segment, setSegment] = useState(initialProfile?.segment ?? "");
  const [model, setModel] = useState(initialProfile?.model ?? "");
  const [taxRegime, setTaxRegime] = useState(initialProfile?.taxRegime ?? "");
  const [monthlyGoal, setMonthlyGoal] = useState(
    initialProfile?.monthlyGoal ? String(initialProfile.monthlyGoal) : "",
  );

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
      toast.success("Perfil para IA atualizado!");
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
          <h3 className="text-sm font-bold text-zinc-100">Perfil para IA</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Contexto enviado para a IA para análises mais precisas e acionáveis
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              Segmento
            </label>
            <input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="ex: convites digitais, e-commerce, SaaS"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              Modelo de Negócio
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="ex: marketplace de templates, assinatura, infoproduto"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
              Regime Tributário
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
              Meta Mensal de Receita (R$)
            </label>
            <input
              type="number"
              value={monthlyGoal}
              onChange={(e) => setMonthlyGoal(e.target.value)}
              placeholder="ex: 5000"
              min="0"
              step="100"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Essas informações são enviadas junto com os dados financeiros para contextualizar a análise da IA. 
          Quanto mais preciso o contexto, mais relevantes serão as recomendações.
        </p>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5 text-xs"
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <IconCheck size={13} />
                Salvar Perfil
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
