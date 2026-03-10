"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { NumericFormat } from "react-number-format";
import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MARKETING_SOURCE_OPTIONS } from "@/utils/marketing-sources";
import type { IMarketingSpend } from "@/interfaces/cost.interface";

const OTHER_SOURCE = "__other__";

const formSchema = z
  .object({
    source: z.string().min(1),
    customSource: z.string().optional(),
    customSourceLabel: z.string().optional(),
    amountInCents: z.number().int().positive(),
    spentAt: z.string().min(1),
    description: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.source === OTHER_SOURCE) {
      if (!val.customSource?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customSource"], message: "required" });
      }
      if (!val.customSourceLabel?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customSourceLabel"], message: "required" });
      }
    }
  });

type FormData = z.infer<typeof formSchema>;

interface MarketingSpendFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: IMarketingSpend | null;
  onSubmit: (data: {
    source: string;
    sourceLabel: string;
    amountInCents: number;
    spentAt: string;
    description?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function MarketingSpendFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading,
}: MarketingSpendFormDialogProps) {
  const t = useTranslations("finance.marketingSpend");
  const locale = useLocale();

  const isEditing = !!initialData;

  const isPredefinedSource = initialData
    ? MARKETING_SOURCE_OPTIONS.some((o) => o.source === initialData.source)
    : false;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: "",
      customSource: "",
      customSourceLabel: "",
      amountInCents: 0,
      spentAt: dayjs().format("YYYY-MM-DD"),
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          source: isPredefinedSource ? initialData.source : OTHER_SOURCE,
          customSource: isPredefinedSource ? "" : initialData.source,
          customSourceLabel: isPredefinedSource ? "" : initialData.sourceLabel,
          amountInCents: initialData.amountInCents,
          spentAt: initialData.spentAt,
          description: initialData.description ?? "",
        });
      } else {
        form.reset({
          source: "",
          customSource: "",
          customSourceLabel: "",
          amountInCents: 0,
          spentAt: dayjs().format("YYYY-MM-DD"),
          description: "",
        });
      }
    }
  }, [open, initialData, isPredefinedSource, form]);

  const selectedSource = form.watch("source");
  const isOther = selectedSource === OTHER_SOURCE;

  const handleSubmit = async (data: FormData) => {
    let resolvedSource = data.source;
    let resolvedLabel = "";

    if (data.source === OTHER_SOURCE) {
      resolvedSource = data.customSource!.trim().toLowerCase().replace(/\s+/g, "_");
      resolvedLabel = data.customSourceLabel!.trim();
    } else {
      const opt = MARKETING_SOURCE_OPTIONS.find((o) => o.source === data.source);
      resolvedLabel = locale === "en" ? (opt?.labelEn ?? data.source) : (opt?.label ?? data.source);
    }

    await onSubmit({
      source: resolvedSource,
      sourceLabel: resolvedLabel,
      amountInCents: data.amountInCents,
      spentAt: data.spentAt,
      description: data.description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {isEditing ? t("formEdit") : t("formAdd")}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs">
            {t("formDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-zinc-400">{t("sourceLabel")}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200 h-9 text-sm">
                        <SelectValue placeholder={t("sourcePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {MARKETING_SOURCE_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.source}
                            value={opt.source}
                            className="text-zinc-200 focus:bg-zinc-700"
                          >
                            {locale === "en" ? opt.labelEn : opt.label}
                          </SelectItem>
                        ))}
                        <SelectItem value={OTHER_SOURCE} className="text-zinc-200 focus:bg-zinc-700">
                          {t("sourceOther")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            {isOther && (
              <>
                <FormField
                  control={form.control}
                  name="customSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-zinc-400">{t("sourceOtherKeyLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("sourceOtherKeyPlaceholder")}
                          className="bg-zinc-800 border-zinc-700 text-zinc-200 h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customSourceLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-zinc-400">{t("sourceOtherLabelField")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("sourceOtherLabelPlaceholder")}
                          className="bg-zinc-800 border-zinc-700 text-zinc-200 h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="amountInCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-zinc-400">{t("amountLabel")}</FormLabel>
                  <FormControl>
                    <NumericFormat
                      value={field.value ? field.value / 100 : ""}
                      onValueChange={(values) =>
                        field.onChange(Math.round((values.floatValue ?? 0) * 100))
                      }
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="R$ "
                      decimalScale={2}
                      fixedDecimalScale
                      placeholder={t("amountPlaceholder")}
                      className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="spentAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-zinc-400">{t("dateLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 h-9 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-zinc-400">{t("descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("descriptionPlaceholder")}
                      rows={2}
                      className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm resize-none"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isLoading ? t("saving") : isEditing ? t("save") : t("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
