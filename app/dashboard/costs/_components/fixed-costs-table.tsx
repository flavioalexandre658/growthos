"use client";

import { useState } from "react";
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveTable, type TableColumn } from "@/components/ui/responsive-table";
import { CostFormDialog } from "./cost-form-dialog";
import { useFixedCosts } from "@/hooks/queries/use-fixed-costs";
import { useCreateFixedCost } from "@/hooks/mutations/use-create-fixed-cost";
import { useUpdateFixedCost } from "@/hooks/mutations/use-update-fixed-cost";
import { useDeleteFixedCost } from "@/hooks/mutations/use-delete-fixed-cost";
import { fmtBRL, fmtBRLDecimal } from "@/utils/format";
import type { IFixedCost, CostValueType } from "@/interfaces/cost.interface";
import toast from "react-hot-toast";

interface FixedCostsTableProps {
  organizationId: string;
}

export function FixedCostsTable({ organizationId }: FixedCostsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IFixedCost | null>(null);

  const { data: costs, isLoading } = useFixedCosts(organizationId);
  const createMutation = useCreateFixedCost(organizationId);
  const updateMutation = useUpdateFixedCost(organizationId);
  const deleteMutation = useDeleteFixedCost(organizationId);

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cost: IFixedCost) => {
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
      toast.success("Custo fixo atualizado!");
    } else {
      await createMutation.mutateAsync({ organizationId, ...data });
      toast.success("Custo fixo adicionado!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    toast.success("Custo fixo removido!");
  };

  const columns: TableColumn<IFixedCost>[] = [
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
        data={(costs ?? []) as IFixedCost[]}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        skeletonRows={4}
        emptyMessage="Nenhum custo fixo cadastrado"
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Custos Fixos</h3>
              <p className="text-xs text-zinc-500">Valores recorrentes independente da receita</p>
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
        costKind="fixed"
        initialData={editing}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
