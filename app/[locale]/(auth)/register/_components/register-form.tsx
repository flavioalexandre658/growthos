"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import {
  IconLoader2,
  IconLock,
  IconMail,
  IconBuilding,
  IconArrowRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register as registerUser } from "@/actions/auth/register.action";
import { growareIdentify, growareTrack } from "@/utils/groware";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const registerSchema = z.object({
    companyName: z.string().min(2, t("companyNameMin")),
    email: z.string().email(t("emailError")),
    password: z.string().min(6, t("passwordMin")),
  });

  type RegisterFormData = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { companyName: "", email: "", password: "" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await registerUser({ ...data, locale: locale as "pt" | "en" });

      if ("error" in result) {
        const msg =
          result.error === "EMAIL_REGISTERED_WITH_GOOGLE"
            ? t("emailRegisteredWithGoogle")
            : result.error === "EMAIL_ALREADY_EXISTS"
              ? t("emailAlreadyExists")
              : t("genericError");
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      const { user, orgSlug } = result;

      const loginResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        growareIdentify(user.id, { name: user.name, email: user.email });
        growareTrack("signup", {
          dedupe: true,
          customer_type: "new",
          customer_id: user.id,
        });
        toast.success(t("successToast"));
        router.push(`/${locale}/${orgSlug}`);
      } else {
        setErrorMessage(t("loginAfterRegisterError"));
      }
    } catch {
      setErrorMessage(t("genericError"));
      toast.error(t("genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="companyName"
          className="text-zinc-400 text-xs uppercase tracking-wider font-semibold"
        >
          {t("companyNameLabel")}
        </Label>
        <div className="relative">
          <IconBuilding
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            id="companyName"
            type="text"
            placeholder={t("companyNamePlaceholder")}
            autoComplete="organization"
            className={cn("pl-9", inputClass, errors.companyName && "border-red-500/50")}
            {...register("companyName")}
          />
        </div>
        {errors.companyName && (
          <p className="text-xs text-red-400">{errors.companyName.message}</p>
        )}
      </div>

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
            className={cn("pl-9", inputClass, errors.email && "border-red-500/50")}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

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
            placeholder={t("passwordPlaceholder")}
            autoComplete="new-password"
            className={cn("pl-9", inputClass, errors.password && "border-red-500/50")}
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-xs text-red-400">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-200 group"
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

      <p className="text-center text-xs text-zinc-600">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href="/login"
          className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
