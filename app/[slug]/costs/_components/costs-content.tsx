"use client";

import { useOrganization } from "@/components/providers/organization-provider";
import { FixedCostsTable } from "./fixed-costs-table";
import { VariableCostsTable } from "./variable-costs-table";

export function CostsContent() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Gerenciar Custos</h1>
        <p className="text-xs text-zinc-500">
          Cadastre custos fixos e variáveis para calcular o P&L no Financeiro
        </p>
      </div>

      {orgId && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <FixedCostsTable organizationId={orgId} />
          <VariableCostsTable organizationId={orgId} />
        </div>
      )}
    </div>
  );
}
