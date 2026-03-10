"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { IconBuilding, IconLoader2, IconArrowRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization } from "@/actions/organizations/create-organization.action";
import { updateOrganizationRegional } from "@/actions/organizations/update-organization-regional.action";
import { pushDataLayerEvent } from "@/utils/datalayer";
import {
  TIMEZONE_OPTIONS,
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  detectBrowserRegional,
} from "@/utils/regional-options";
import { cn } from "@/lib/utils";
import type { IOrganization } from "@/interfaces/organization.interface";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface StepOrganizationProps {
  onComplete: (org: IOrganization) => void;
}

const selectClass =
  "h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function StepOrganization({ onComplete }: StepOrganizationProps) {
  const t = useTranslations("onboarding.stepOrganization");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [currency, setCurrency] = useState("BRL");
  const [locale, setLocale] = useState("pt-BR");
  const [country, setCountry] = useState("BR");
  const [language, setLanguage] = useState("pt-BR");

  useEffect(() => {
    const regional = detectBrowserRegional();
    setTimezone(regional.timezone);
    setCurrency(regional.currency);
    setLocale(regional.locale);
    setCountry(regional.country);
    setLanguage(regional.language);
  }, []);

  const schema = z.object({
    name: z.string().min(2, t("validation.nameMinLength")),
    slug: z
      .string()
      .min(2, t("validation.slugMinLength"))
      .regex(/^[a-z0-9-]+$/, t("validation.slugPattern")),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const nameValue = watch("name");
  const slugValue = watch("slug");

  useEffect(() => {
    if (!slugEdited && nameValue) {
      setValue("slug", toSlug(nameValue), { shouldValidate: true });
    }
  }, [nameValue, slugEdited, setValue]);

  const handleLocaleChange = (value: string) => {
    setLocale(value);
    const matched = LOCALE_OPTIONS.find((l) => l.value === value);
    if (matched) {
      setCurrency(matched.currency);
      setCountry(matched.country);
      setLanguage(matched.language);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await createOrganization(data);
      if ("error" in result && result.error) {
        setErrorMessage(result.error);
        if (result.error.includes("slug")) {
          setError("slug", { message: result.error });
        }
        return;
      }

      const org = result.data as IOrganization;

      await updateOrganizationRegional({
        organizationId: org.id,
        timezone,
        currency,
        locale,
        country,
        language,
      });

      toast.success(t("successToast"));
      pushDataLayerEvent("OrganizationCreated");
      onComplete({ ...org, timezone, currency, locale, country, language });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errorToast");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30">
          <IconBuilding size={18} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{t("title")}</h2>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            {t("nameLabel")}
          </Label>
          <Input
            type="text"
            placeholder={t("namePlaceholder")}
            className={cn(inputClass, errors.name && "border-red-500/50")}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            {t("slugLabel")}
          </Label>
          <div
            className={cn(
              "flex items-stretch rounded-lg border overflow-hidden",
              errors.slug ? "border-red-500/50" : "border-zinc-800",
            )}
          >
            <span className="flex items-center px-3 bg-zinc-800/70 text-zinc-500 text-xs font-mono select-none border-r border-zinc-800 whitespace-nowrap shrink-0">
              org/
            </span>
            <Input
              type="text"
              placeholder={t("slugPlaceholder")}
              className={cn(
                "font-mono border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0",
                inputClass,
              )}
              {...register("slug", {
                onChange: () => setSlugEdited(true),
              })}
            />
          </div>
          {errors.slug ? (
            <p className="text-xs text-red-400">{errors.slug.message}</p>
          ) : slugValue ? (
            <p className="text-xs text-zinc-600">
              {t("slugHint")}{" "}
              <code className="text-indigo-400 font-mono">{slugValue}</code>
            </p>
          ) : null}
        </div>

        <div className="h-px bg-zinc-800/60" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
              {t("localeLabel")}
            </Label>
            <select
              value={locale}
              onChange={(e) => handleLocaleChange(e.target.value)}
              className={selectClass}
            >
              {LOCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
              {t("currencyLabel")}
            </Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={selectClass}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value} — {opt.label.split(" (")[0]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
              {t("timezoneLabel")}
            </Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={selectClass}
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{errorMessage}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 group"
        >
          {isLoading ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              {t("submitting")}
            </>
          ) : (
            <>
              {t("submit")}
              <IconArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
