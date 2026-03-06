"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  IconLoader2,
  IconMail,
  IconArrowLeft,
  IconCircleCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { requestPasswordReset } from "@/actions/auth/request-password-reset.action";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const schema = z.object({
    email: z.string().email(t("emailError")),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    await requestPasswordReset({ email: data.email });
    setSent(true);
    setIsLoading(false);
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/20">
            <IconCircleCheck size={24} className="text-emerald-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-100">{t("sentTitle")}</h3>
          <p className="text-sm text-zinc-500">
            {t("sentDesc").replace("{email}", getValues("email"))}
          </p>
        </div>
        <p className="text-xs text-zinc-600">
          {t("notReceived")}{" "}
          <button
            onClick={() => setSent(false)}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {t("tryAgain")}
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-zinc-400 text-xs uppercase tracking-wider font-semibold"
        >
          {t("emailLabel")}
        </Label>
        <div className="relative">
          <IconMail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            className={cn(
              "pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11",
              errors.email && "border-red-500/50",
            )}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
      >
        {isLoading ? (
          <>
            <IconLoader2 size={16} className="animate-spin" />
            {t("submittingBtn")}
          </>
        ) : (
          t("submitBtn")
        )}
      </Button>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <IconArrowLeft size={13} />
          {t("backToLogin")}
        </Link>
      </div>
    </form>
  );
}
