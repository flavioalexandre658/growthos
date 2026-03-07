"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { NumericFormat } from "react-number-format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type {
  IFixedCost,
  IVariableCost,
  VariableCostApplyTo,
  FixedCostFrequency,
} from "@/interfaces/cost.interface";

interface CostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costKind: "fixed" | "variable";
  initialData?: IFixedCost | IVariableCost | null;
  onSubmit: (data: {
    name: string;
    amountInCents: number;
    type: "VALUE" | "PERCENTAGE";
    frequency?: FixedCostFrequency;
    applyTo?: VariableCostApplyTo;
    applyToValue?: string | null;
    description?: string;
  }) => void;
  isLoading?: boolean;
}

export function CostFormDialog({
  open,
  onOpenChange,
  costKind,
  initialData,
  onSubmit,
  isLoading,
}: CostFormDialogProps) {
  const t = useTranslations("finance.costForm");
  const isVariable = costKind === "variable";
  const isEditing = !!initialData;

  const title = isVariable
    ? (isEditing ? t("editVariable") : t("addVariable"))
    : (isEditing ? t("editFixed") : t("addFixed"));

  const formSchema = z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    amountInCents: z
      .number({ required_error: t("validation.valueRequired") })
      .positive(t("validation.valueMustBePositive")),
    frequency: z
      .enum(["monthly", "quarterly", "semiannual", "annual"])
      .optional(),
    description: z.string().optional(),
    applyTo: z.enum(["all", "payment_method", "billing_type", "category"]).optional(),
    applyToValue: z.string().nullable().optional(),
  });

  type FormData = z.infer<typeof formSchema>;

  const paymentMethodOptions = [
    { value: "credit_card", label: t("paymentMethods.creditCard") },
    { value: "debit_card", label: t("paymentMethods.debitCard") },
    { value: "pix", label: t("paymentMethods.pix") },
    { value: "boleto", label: t("paymentMethods.boleto") },
    { value: "other", label: t("paymentMethods.other") },
  ];

  const billingTypeOptions = [
    { value: "one_time", label: t("billingTypes.oneTime") },
    { value: "recurring", label: t("billingTypes.recurring") },
  ];

  const frequencyOptions: { value: FixedCostFrequency; label: string; sub: string }[] = [
    { value: "monthly", label: t("frequencyOptions.monthly"), sub: t("frequencyOptions.monthlySub") },
    { value: "quarterly", label: t("frequencyOptions.quarterly"), sub: t("frequencyOptions.quarterlySub") },
    { value: "semiannual", label: t("frequencyOptions.semiannual"), sub: t("frequencyOptions.semiannualSub") },
    { value: "annual", label: t("frequencyOptions.annual"), sub: t("frequencyOptions.annualSub") },
  ];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amountInCents: 0,
      frequency: "monthly",
      description: "",
      applyTo: "all",
      applyToValue: null,
    },
  });

  const watchApplyTo = form.watch("applyTo");

  useEffect(() => {
    if (initialData) {
      const varData = initialData as IVariableCost;
      const fixedData = initialData as IFixedCost;
      form.reset({
        name: initialData.name,
        amountInCents: initialData.amountInCents,
        frequency: fixedData.frequency ?? "monthly",
        description: initialData.description ?? "",
        applyTo: varData.applyTo ?? "all",
        applyToValue: varData.applyToValue ?? null,
      });
    } else {
      form.reset({
        name: "",
        amountInCents: 0,
        frequency: "monthly",
        description: "",
        applyTo: "all",
        applyToValue: null,
      });
    }
  }, [initialData, open, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      amountInCents: data.amountInCents,
      type: isVariable ? "PERCENTAGE" : "VALUE",
      ...(!isVariable && {
        frequency: data.frequency ?? "monthly",
      }),
      ...(isVariable && {
        applyTo: data.applyTo ?? "all",
        applyToValue: data.applyTo !== "all" ? (data.applyToValue ?? null) : null,
      }),
      description: data.description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{title}</DialogTitle>
        </DialogHeader>

        {isVariable && (
          <p className="text-xs text-zinc-500 -mt-1">
            {t("variableDescription")}
          </p>
        )}
        {!isVariable && (
          <p className="text-xs text-zinc-500 -mt-1">
            {t("fixedDescription")}
          </p>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">{t("nameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={
                        isVariable
                          ? t("namePlaceholderVariable")
                          : t("namePlaceholderFixed")
                      }
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountInCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">
                    {isVariable ? t("percentageLabel") : t("valueLabel")}
                  </FormLabel>
                  <FormControl>
                    {isVariable ? (
                      <NumericFormat
                        value={field.value / 100}
                        onValueChange={(values) => {
                          field.onChange(Math.round((values.floatValue ?? 0) * 100));
                        }}
                        decimalSeparator=","
                        thousandSeparator="."
                        decimalScale={2}
                        suffix="%"
                        placeholder={t("percentagePlaceholder")}
                        customInput={Input}
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                      />
                    ) : (
                      <NumericFormat
                        value={field.value / 100}
                        onValueChange={(values) => {
                          field.onChange(Math.round((values.floatValue ?? 0) * 100));
                        }}
                        thousandSeparator="."
                        decimalSeparator=","
                        prefix="R$ "
                        decimalScale={2}
                        placeholder={t("valuePlaceholder")}
                        customInput={Input}
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isVariable && (
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">{t("frequencyLabel")}</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {frequencyOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                            field.value === opt.value
                              ? "border-indigo-500/60 bg-indigo-600/10 text-indigo-300"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                          }`}
                        >
                          <span className="text-xs font-semibold">{opt.label}</span>
                          <span className="text-[10px] opacity-70">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isVariable && (
              <FormField
                control={form.control}
                name="applyTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">{t("applyToLabel")}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value ?? "all"}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("applyToValue", null);
                        }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="all" id="apply-all" className="border-zinc-600" />
                          <Label htmlFor="apply-all" className="text-zinc-300 font-normal cursor-pointer">
                            {t("applyToAllRevenue")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="payment_method" id="apply-payment" className="border-zinc-600" />
                          <Label htmlFor="apply-payment" className="text-zinc-300 font-normal cursor-pointer">
                            {t("applyToPaymentMethod")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="billing_type" id="apply-billing" className="border-zinc-600" />
                          <Label htmlFor="apply-billing" className="text-zinc-300 font-normal cursor-pointer">
                            {t("applyToBillingType")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="category" id="apply-category" className="border-zinc-600" />
                          <Label htmlFor="apply-category" className="text-zinc-300 font-normal cursor-pointer">
                            {t("applyToCategory")}
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isVariable && watchApplyTo === "payment_method" && (
              <FormField
                control={form.control}
                name="applyToValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">{t("paymentMethodLabel")}</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectValue placeholder={t("paymentMethodPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {paymentMethodOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-zinc-200 focus:bg-zinc-800"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isVariable && watchApplyTo === "billing_type" && (
              <FormField
                control={form.control}
                name="applyToValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">{t("billingTypeLabel")}</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                          <SelectValue placeholder={t("billingTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {billingTypeOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-zinc-200 focus:bg-zinc-800"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isVariable && watchApplyTo === "category" && (
              <FormField
                control={form.control}
                name="applyToValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">{t("categoryNameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder={t("categoryPlaceholder")}
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                      />
                    </FormControl>
                    <p className="text-[10px] text-zinc-600">
                      {t("categoryHint")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">{t("descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("descriptionPlaceholder")}
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isLoading ? t("saving") : isEditing ? t("save") : t("addButton")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
