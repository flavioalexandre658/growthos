"use client";

import { useState } from "react";
import { IconPlus, IconPencil, IconTrash, IconPercentage } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveTable,
  type TableColumn,
} from "@/components/ui/responsive-table";
import { CostFormDialog } from "./cost-form-dialog";
import { useVariableCosts } from "@/hooks/queries/use-variable-costs";
import { useCreateVariableCost } from "@/hooks/mutations/use-create-variable-cost";
import { useUpdateVariableCost } from "@/hooks/mutations/use-update-variable-cost";
import { useDeleteVariableCost } from "@/hooks/mutations/use-delete-variable-cost";
import type { IVariableCost, VariableCostApplyTo } from "@/interfaces/cost.interface";
import toast from "react-hot-toast";

const APPLY_TO_LABELS: Record<string, string> = {
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  pix: "PIX",
  boleto: "Boleto",
  one_time: "Avulso",
  recurring: "Recorrente",
  other: "Outro",
};

function formatApplyTo(
  applyTo: VariableCostApplyTo,
  applyToValue: string | null
): string {
  if (applyTo === "all") return "Toda receita";
  if (applyTo === "category" && applyToValue) return `Cat: ${applyToValue}`;
  if (
    (applyTo === "payment_method" || applyTo === "billing_type") &&
    applyToValue
  ) {
    return APPLY_TO_LABELS[applyToValue] ?? applyToValue;
  }
  return "Toda receita";
}

interface VariableCostsTableProps {
  organizationId: string;
  grossRevenueInCents?: number;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/70 border border-zinc-700">
        <IconPercentage size={20} className="text-zinc-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">Nenhum custo variável ainda</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
          Custos variáveis são percentuais sobre a receita como impostos, comissões e taxas de gateway.
        </p>
      </div>
      <Button
        size="sm"
        onClick={onAdd}
        className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5 mt-1"
      >
        <IconPlus size={13} />
        Adicionar primeiro custo
      </Button>
    </div>
  );
}

export function VariableCostsTable({
  organizationId,
  grossRevenueInCents,
}: VariableCostsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IVariableCost | null>(null);

  const { data: costs, isLoading } = useVariableCosts(organizationId);
  const createMutation = useCreateVariableCost(organizationId);
  const updateMutation = useUpdateVariableCost(organizationId);
  const deleteMutation = useDeleteVariableCost(organizationId);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cost: IVariableCost) => {
    setEditing(cost);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: {
    name: string;
    amountInCents: number;
    type: "VALUE" | "PERCENTAGE";
    applyTo?: VariableCostApplyTo;
    applyToValue?: string | null;
    description?: string;
  }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...data });
      toast.success("Custo variável atualizado!");
    } else {
      await createMutation.mutateAsync({
        organizationId,
        ...data,
        applyTo: data.applyTo ?? "all",
      });
      toast.success("Custo variável adicionado!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    toast.success("Custo variável removido!");
  };

  const columns: TableColumn<IVariableCost>[] = [
    {
      key: "name",
      header: "Nome",
      mobilePrimary: true,
      render: (row) => (
        <div>
          <span className="font-medium text-zinc-100">{row.name}</span>
          {row.description && (
            <p className="text-[10px] text-zinc-600 mt-0.5">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Taxa",
      align: "right",
      render: (row) => {
        const pctStr = (row.amountInCents / 100).toFixed(2).replace(".", ",");
        const grossRev = grossRevenueInCents ?? 0;
        const calculatedCents =
          grossRev > 0 ? Math.round((grossRev * row.amountInCents) / 10000) : 0;
        return (
          <div className="text-right">
            <span className="font-mono text-zinc-200 font-semibold">
              {pctStr}%
            </span>
            {calculatedCents > 0 && (
              <p className="text-[10px] text-zinc-500 mt-0.5">
                ≈ R${" "}
                {(calculatedCents / 100)
                  .toFixed(2)
                  .replace(".", ",")}{" "}
                / mês
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "applyTo",
      header: "Aplicar sobre",
      mobileHide: false,
      render: (row) => {
        const label = formatApplyTo(
          row.applyTo ?? "all",
          row.applyToValue ?? null
        );
        const isFiltered = (row.applyTo ?? "all") !== "all";
        return (
          <Badge
            variant={isFiltered ? "outline" : "secondary"}
            className="text-[10px] font-normal border-zinc-700"
          >
            {label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
            onClick={() => handleOpenEdit(row)}
          >
            <IconPencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-red-400"
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
          >
            <IconTrash size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ResponsiveTable
        columns={columns}
        data={(costs ?? []) as IVariableCost[]}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        skeletonRows={4}
        emptyMessage={<EmptyState onAdd={handleOpenCreate} />}
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Custos Variáveis</h3>
              <p className="text-xs text-zinc-500">
                Percentuais sobre a receita — impostos, comissões e taxas
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5"
            >
              <IconPlus size={14} />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </div>
        }
      />

      <CostFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        costKind="variable"
        initialData={editing}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
