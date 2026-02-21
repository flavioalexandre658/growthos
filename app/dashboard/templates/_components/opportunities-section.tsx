"use client";

import { ITemplateData } from "@/interfaces/dashboard.interface";
import { Button } from "@/components/ui/button";
import { ResponsiveTable, TableColumn } from "@/components/ui/responsive-table";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";

interface OpportunitiesSectionProps {
  data: ITemplateData[] | undefined;
  isLoading: boolean;
}

function TemplateLink({ slug, name }: { slug: string; name: string }) {
  return (
    <a
      href={`https://convitede.com/convite/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-zinc-500 hover:text-indigo-400 shrink-0"
        title={`Ver convite: ${name}`}
      >
        <IconExternalLink size={13} />
      </Button>
    </a>
  );
}

type Opportunity = ITemplateData & { estimated_loss: string };

export function OpportunitiesSection({ data, isLoading }: OpportunitiesSectionProps) {
  const opportunities: Opportunity[] = [...(data ?? [])]
    .filter((t) => t.views > 3000 && parseFloat(t.edit_to_payment) < 30)
    .sort((a, b) => b.views - a.views)
    .map((t) => ({
      ...t,
      estimated_loss: ((t.edits * 0.35 - t.payments) * t.price).toFixed(0),
    }));

  const columns: TableColumn<Opportunity>[] = [
    {
      key: "name",
      header: "Template",
      mobilePrimary: true,
      render: (t) => (
        <div className="flex items-center gap-1.5">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-zinc-200">{t.name}</span>
              <TemplateLink slug={t.slug} name={t.name} />
            </div>
            <span className="text-xs text-zinc-500">
              {Number(t.views).toLocaleString("pt-BR")} views · {t.category}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm text-zinc-400">{t.edits}</span>
      ),
    },
    {
      key: "edit_to_payment",
      header: "Edit→Pago",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm font-bold text-red-400">
          {t.edit_to_payment}%
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Receita Real",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm text-zinc-400">
          R$ {Number(t.revenue).toFixed(0)}
        </span>
      ),
    },
    {
      key: "estimated_loss",
      header: "Receita Perdida Est.",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm font-bold text-amber-400">
          R$ {t.estimated_loss}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={opportunities}
      getRowKey={(t) => t.uuid}
      isLoading={isLoading}
      initialPageSize={10}
      emptyMessage="Nenhum template nessa condição — ótimo sinal!"
      header={
        <div className="flex items-start gap-3">
          <IconAlertTriangle
            size={16}
            className="text-red-400 shrink-0 mt-0.5"
          />
          <div>
            <h3 className="text-sm font-bold text-red-300">
              Oportunidades: Muito Acessados, Pouco Convertidos
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Templates com +3.000 views e conversão Edit→Pago abaixo de 30% —
              verificar preço, UX ou CTA
            </p>
          </div>
        </div>
      }
    />
  );
}
