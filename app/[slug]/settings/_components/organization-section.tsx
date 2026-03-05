"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  IconBuilding,
  IconTrash,
  IconLoader2,
  IconAlertTriangle,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { updateOrganization } from "@/actions/organizations/update-organization.action";
import { deleteOrganization } from "@/actions/organizations/delete-organization.action";
import type { IOrganization } from "@/interfaces/organization.interface";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter ao menos 2 caracteres")
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens",
    ),
});

type FormData = z.infer<typeof formSchema>;

interface OrganizationSectionProps {
  organization: IOrganization;
}

export function OrganizationSection({ organization }: OrganizationSectionProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  const slugValue = form.watch("slug");
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://growthos.dev";

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const updated = await updateOrganization({
        organizationId: organization.id,
        name: data.name,
        slug: data.slug,
      });

      toast.success("Organização atualizada!");

      if (updated.slug !== organization.slug) {
        router.push(`/${updated.slug}/settings/organization`);
      } else {
        form.reset({ name: updated.name, slug: updated.slug });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== organization.name) return;
    setIsDeleting(true);
    try {
      await deleteOrganization({
        organizationId: organization.id,
        confirmationName: deleteConfirmation,
      });
      toast.success("Organização excluída.");
      router.push("/organizations");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
      setIsDeleting(false);
    }
  };

  const isDeleteConfirmed = deleteConfirmation === organization.name;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 shrink-0">
            <IconBuilding size={15} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              Informações da organização
            </p>
            <p className="text-xs text-zinc-600">
              Nome e URL usados em todo o sistema
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Nome da organização
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Minha empresa"
                      className="bg-zinc-950 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600/50"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Slug da URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="minha-empresa"
                      className="bg-zinc-950 border-zinc-700 text-zinc-100 font-mono focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600/50"
                      onChange={(e) =>
                        field.onChange(
                          e.target.value.toLowerCase().replace(/\s+/g, "-"),
                        )
                      }
                    />
                  </FormControl>
                  <p className="text-[11px] text-zinc-600 font-mono mt-1">
                    {baseUrl}/
                    <span className="text-indigo-400">
                      {slugValue || "seu-slug"}
                    </span>
                  </p>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isSaving || !form.formState.isDirty}
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSaving ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconDeviceFloppy size={14} />
                )}
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-5 space-y-4">
        <div className="flex items-start gap-2.5">
          <IconAlertTriangle
            size={16}
            className="text-red-400 mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-red-300">Zona de perigo</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              Ações irreversíveis. Prossiga com cuidado.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-red-900/30 bg-red-950/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Excluir organização
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Remove permanentemente todos os eventos, pagamentos, canais e
              configurações.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsDeleteOpen(true)}
            className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 border border-red-900/40 shrink-0"
          >
            <IconTrash size={14} />
            Excluir
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-red-400" />
              Excluir organização?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-zinc-400">
                <p>
                  Esta ação é{" "}
                  <span className="font-semibold text-red-400">
                    permanente e irreversível
                  </span>
                  . Todos os dados serão perdidos:
                </p>
                <ul className="space-y-1 text-zinc-500 text-xs pl-4 list-disc">
                  <li>Todos os eventos registrados</li>
                  <li>Histórico de pagamentos e receita</li>
                  <li>Configurações, funil e perfil de IA</li>
                  <li>API keys e membros da equipe</li>
                </ul>
                <p className="pt-1">
                  Para confirmar, digite{" "}
                  <span className="font-mono font-semibold text-zinc-200">
                    {organization.name}
                  </span>{" "}
                  abaixo:
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder={organization.name}
            className="bg-zinc-950 border-zinc-700 text-zinc-100 font-mono focus-visible:ring-red-500/50 focus-visible:border-red-600/50"
          />

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={!isDeleteConfirmed || isDeleting}
              className="gap-2 bg-red-700 hover:bg-red-600 text-white disabled:opacity-40"
            >
              {isDeleting ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconTrash size={14} />
              )}
              {isDeleting ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
