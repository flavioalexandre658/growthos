"use client";

import { useState } from "react";
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
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

function formatApplyTo(applyTo: VariableCostApplyTo, applyToValue: string | null): string {
  if (applyTo === "all") return "Toda receita";
  if (applyTo === "payment_method" && applyToValue) {
    return APPLY_TO_LABELS[applyToValue] ?? applyToValue;
  }
  if (applyTo === "billing_type" && applyToValue) {
    return APPLY_TO_LABELS[applyToValue] ?? applyToValue;
  }
  return "Toda receita";
}

interface VariableCostsTableProps {
  organizationId: string;
}

export function VariableCostsTable({
  organizationId,
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
        <span className="font-medium text-zinc-100">{row.name}</span>
      ),
    },
    {
      key: "amount",
      header: "Percentual",
      align: "right",
      render: (row) => (
        <span className="font-mono text-zinc-200">
          {(row.amountInCents / 100).toFixed(2)}%
        </span>
      ),
    },
    {
      key: "applyTo",
      header: "Aplicar sobre",
      mobileHide: false,
      render: (row) => {
        const label = formatApplyTo(row.applyTo ?? "all", row.applyToValue ?? null);
        const isFiltered = (row.applyTo ?? "all") !== "all";
        return (
          <Badge
            variant={isFiltered ? "outline" : "secondary"}
            className="text-[10px] font-normal"
          >
            {label}
          </Badge>
        );
      },
    },
    {
      key: "description",
      header: "Descrição",
      mobileHide: true,
      render: (row) => (
        <span className="text-zinc-500 text-xs">{row.description ?? ""}</span>
      ),
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
        emptyMessage="Nenhum custo variável cadastrado"
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Custos Variáveis
              </h3>
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
