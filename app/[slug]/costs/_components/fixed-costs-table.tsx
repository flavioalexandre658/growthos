"use client";

import { useState } from "react";
import { IconPlus, IconPencil, IconTrash, IconBuildingBank } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveTable,
  type TableColumn,
} from "@/components/ui/responsive-table";
import { CostFormDialog } from "./cost-form-dialog";
import { useFixedCosts } from "@/hooks/queries/use-fixed-costs";
import { useCreateFixedCost } from "@/hooks/mutations/use-create-fixed-cost";
import { useUpdateFixedCost } from "@/hooks/mutations/use-update-fixed-cost";
import { useDeleteFixedCost } from "@/hooks/mutations/use-delete-fixed-cost";
import { fmtBRLDecimal } from "@/utils/format";
import type { IFixedCost, FixedCostFrequency } from "@/interfaces/cost.interface";
import toast from "react-hot-toast";

const FREQUENCY_LABELS: Record<FixedCostFrequency, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

const FREQUENCY_MONTHS: Record<FixedCostFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

function getMonthlyAmount(cost: IFixedCost): number {
  const freq = (cost.frequency as FixedCostFrequency) ?? "monthly";
  return cost.amountInCents / FREQUENCY_MONTHS[freq];
}

interface FixedCostsTableProps {
  organizationId: string;
  grossRevenueInCents?: number;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/70 border border-zinc-700">
        <IconBuildingBank size={20} className="text-zinc-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">Nenhum custo fixo ainda</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
          Custos fixos são despesas constantes como servidor, salários e ferramentas.
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

export function FixedCostsTable({ organizationId, grossRevenueInCents }: FixedCostsTableProps) {
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
    type: "VALUE" | "PERCENTAGE";
    frequency?: FixedCostFrequency;
    description?: string;
  }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...data });
      toast.success("Custo fixo atualizado!");
    } else {
      await createMutation.mutateAsync({ organizationId, ...data, frequency: data.frequency ?? "monthly" });
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
      key: "frequency",
      header: "Frequência",
      render: (row) => {
        const freq = (row.frequency as FixedCostFrequency) ?? "monthly";
        return (
          <Badge variant="outline" className="text-[10px] font-normal border-zinc-700 text-zinc-400">
            {FREQUENCY_LABELS[freq]}
          </Badge>
        );
      },
    },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      render: (row) => {
        const freq = (row.frequency as FixedCostFrequency) ?? "monthly";
        const monthly = getMonthlyAmount(row);
        const impactPct =
          grossRevenueInCents && grossRevenueInCents > 0
            ? ((monthly / grossRevenueInCents) * 100).toFixed(1).replace(".", ",")
            : null;
        return (
          <div className="text-right">
            <span className="font-mono text-zinc-200">
              {fmtBRLDecimal(row.amountInCents / 100)}
            </span>
            <span className="text-zinc-600 text-[10px] ml-1">
              /{FREQUENCY_LABELS[freq].toLowerCase()}
            </span>
            {freq !== "monthly" && (
              <p className="text-[10px] text-zinc-500 mt-0.5">
                ≈ {fmtBRLDecimal(monthly / 100)}/mês
              </p>
            )}
            {impactPct && (
              <p className="text-[10px] text-zinc-600 mt-0.5">{impactPct}% da receita</p>
            )}
          </div>
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
        data={(costs ?? []) as IFixedCost[]}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        skeletonRows={4}
        emptyMessage={<EmptyState onAdd={handleOpenCreate} />}
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Custos Fixos</h3>
              <p className="text-xs text-zinc-500">
                Despesas constantes — servidor, salário, ferramentas
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
        costKind="fixed"
        initialData={editing}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
