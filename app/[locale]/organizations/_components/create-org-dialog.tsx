"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { IconBuilding, IconLoader2 } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOrganization } from "@/actions/organizations/create-organization.action";
import type { IOrganization } from "@/interfaces/organization.interface";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug deve conter apenas letras minúsculas, números e hífens"
    ),
});

type FormData = z.infer<typeof formSchema>;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (org: IOrganization) => void;
}

export function CreateOrgDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrgDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", slug: "" },
  });

  const { isSubmitting } = form.formState;
  const nameValue = form.watch("name");

  useEffect(() => {
    if (nameValue) {
      form.setValue("slug", toSlug(nameValue), { shouldValidate: false });
    }
  }, [nameValue, form]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const org = await createOrganization(data);
      toast.success(`Organização "${org.name}" criada com sucesso!`);
      onSuccess(org as IOrganization);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar organização";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 ring-1 ring-indigo-600/30">
            <IconBuilding size={18} className="text-indigo-400" />
          </div>
          <DialogTitle className="text-zinc-100">Nova organização</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Crie um workspace para um novo produto ou empresa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Nome</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Minha Empresa"
                      className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Slug</FormLabel>
                  <FormControl>
                    <div className="flex items-stretch rounded-lg border border-zinc-700 overflow-hidden">
                      <span className="flex items-center px-3 bg-zinc-800/70 text-zinc-500 text-xs font-mono select-none border-r border-zinc-700 whitespace-nowrap shrink-0">
                        org/
                      </span>
                      <Input
                        {...field}
                        placeholder="minha-empresa"
                        className="font-mono text-sm text-zinc-100 placeholder:text-zinc-600 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-zinc-900"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSubmitting ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : null}
                {isSubmitting ? "Criando..." : "Criar organização"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
