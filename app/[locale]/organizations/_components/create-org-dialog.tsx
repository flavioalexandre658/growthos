"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
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

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t("nameMinError")),
    slug: z
      .string()
      .min(2, t("slugMinError"))
      .regex(/^[a-z0-9-]+$/, t("slugFormatError")),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

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
  const t = useTranslations("organizations.createDialog");
  const formSchema = createFormSchema(t);
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
      const result = await createOrganization(data);
      if ("error" in result && result.error) {
        if (result.error.includes("slug")) {
          form.setError("slug", { message: result.error });
        } else {
          toast.error(result.error);
        }
        return;
      }
      if (!result.data) return;
      toast.success(t("successToast", { name: result.data.name }));
      onSuccess(result.data as IOrganization);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("errorToast");
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
          <DialogTitle className="text-zinc-100">{t("title")}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">{t("nameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("namePlaceholder")}
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
                  <FormLabel className="text-zinc-300">{t("slugLabel")}</FormLabel>
                  <FormControl>
                    <div className="flex items-stretch rounded-lg border border-zinc-700 overflow-hidden">
                      <span className="flex items-center px-3 bg-zinc-800/70 text-zinc-500 text-xs font-mono select-none border-r border-zinc-700 whitespace-nowrap shrink-0">
                        {t("slugPrefix")}
                      </span>
                      <Input
                        {...field}
                        placeholder={t("slugPlaceholder")}
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
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSubmitting ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : null}
                {isSubmitting ? t("creating") : t("createButton")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
