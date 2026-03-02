"use client";

import { useState } from "react";
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveTable, type TableColumn } from "@/components/ui/responsive-table";
import { CostFormDialog } from "./cost-form-dialog";
import { useVariableCosts } from "@/hooks/queries/use-variable-costs";
import { useCreateVariableCost } from "@/hooks/mutations/use-create-variable-cost";
import { useUpdateVariableCost } from "@/hooks/mutations/use-update-variable-cost";
import { useDeleteVariableCost } from "@/hooks/mutations/use-delete-variable-cost";
import { fmtBRLDecimal } from "@/utils/format";
import type { IVariableCost, CostValueType } from "@/interfaces/cost.interface";
import toast from "react-hot-toast";

interface VariableCostsTableProps {
  organizationId: string;
}

export function VariableCostsTable({ organizationId }: VariableCostsTableProps) {
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
    type: CostValueType;
    description?: string;
  }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...data });
      toast.success("Custo variável atualizado!");
    } else {
      await createMutation.mutateAsync({ organizationId, ...data });
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
      render: (row) => <span className="font-medium text-zinc-100">{row.name}</span>,
    },
    {
      key: "type",
      header: "Tipo",
      render: (row) => (
        <Badge variant={row.type === "VALUE" ? "secondary" : "outline"} className="text-[10px]">
          {row.type === "VALUE" ? "R$" : "%"}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      render: (row) =>
        row.type === "PERCENTAGE"
          ? <span className="font-mono text-zinc-200">{(row.amountInCents / 100).toFixed(2)}%</span>
          : <span className="font-mono text-zinc-200">{fmtBRLDecimal(row.amountInCents / 100)}</span>,
    },
    {
      key: "description",
      header: "Descrição",
      mobileHide: true,
      render: (row) => <span className="text-zinc-500 text-xs">{row.description ?? "—"}</span>,
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
              <h3 className="text-sm font-bold text-zinc-100">Custos Variáveis</h3>
              <p className="text-xs text-zinc-500">Percentuais ou valores sobre a receita</p>
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
