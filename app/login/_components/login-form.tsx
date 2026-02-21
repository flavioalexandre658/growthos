"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconLoader2, IconLock, IconMail, IconArrowRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.ok) {
      toast.success("Bem-vindo ao GrowthOS!");
      router.push("/dashboard");
      router.refresh();
    } else {
      const message =
        result?.error === "CredentialsSignin"
          ? "Email ou senha inválidos, ou você não tem permissão de acesso."
          : "Erro ao fazer login. Tente novamente.";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
          Email
        </Label>
        <div className="relative">
          <IconMail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            id="email"
            type="email"
            placeholder="admin@convitede.com"
            autoComplete="email"
            className={cn(
              "pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11",
              errors.email && "border-red-500/50"
            )}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
          Senha
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
            autoComplete="current-password"
            className={cn(
              "pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11",
              errors.password && "border-red-500/50"
            )}
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
            Entrando...
          </>
        ) : (
          <>
            Entrar no GrowthOS
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
