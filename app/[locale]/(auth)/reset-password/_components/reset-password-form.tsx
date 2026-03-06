"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import {
  IconLoader2,
  IconLock,
  IconArrowRight,
  IconCircleCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { resetPassword } from "@/actions/auth/reset-password.action";

export function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const schema = z
    .object({
      password: z.string().min(6, t("passwordMin")),
      confirmPassword: z.string().min(1, t("confirmRequired")),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error(t("tokenError"));
      return;
    }

    setIsLoading(true);

    const result = await resetPassword({
      token,
      password: data.password,
      confirmPassword: data.confirmPassword,
    }).catch((err: Error) => {
      toast.error(err.message ?? t("resetError"));
      setIsLoading(false);
      return null;
    });

    if (result?.success) {
      setDone(true);
      setIsLoading(false);
      setTimeout(() => router.push("/login"), 2500);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-zinc-500">
          {t("invalidToken")}{" "}
          <Link
            href="/forgot-password"
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {t("requestNew")}
          </Link>
          .
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/20">
            <IconCircleCheck size={24} className="text-emerald-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-zinc-100">
            {t("doneTitle")}
          </h3>
          <p className="text-sm text-zinc-500">
            {t("doneDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-zinc-400 text-xs uppercase tracking-wider font-semibold"
        >
          {t("passwordLabel")}
        </Label>
        <div className="relative">
          <IconLock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className={cn(
              "pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11",
              errors.password && "border-red-500/50",
            )}
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="confirmPassword"
          className="text-zinc-400 text-xs uppercase tracking-wider font-semibold"
        >
          {t("confirmPasswordLabel")}
        </Label>
        <div className="relative">
          <IconLock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className={cn(
              "pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11",
              errors.confirmPassword && "border-red-500/50",
            )}
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-400">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold group"
      >
        {isLoading ? (
          <>
            <IconLoader2 size={16} className="animate-spin" />
            {t("submittingBtn")}
          </>
        ) : (
          <>
            {t("submitBtn")}
            <IconArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </>
        )}
      </Button>
    </form>
  );
}
