"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  IconLoader2,
  IconLock,
  IconMail,
  IconUser,
  IconArrowRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register as registerUser } from "@/actions/auth/register.action";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await registerUser(data);

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        toast.success("Conta criada! Vamos configurar tudo.");
        router.push("/onboarding");
      } else {
        setErrorMessage("Conta criada, mas erro ao fazer login. Tente entrar manualmente.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente.";
      setErrorMessage(message);
      toast.error(message);
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
          htmlFor="name"
          className="text-zinc-400 text-xs uppercase tracking-wider font-semibold"
        >
          Nome
        </Label>
        <div className="relative">
          <IconUser
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            className={cn("pl-9", inputClass, errors.name && "border-red-500/50")}
            {...register("name")}
          />
        </div>
        {errors.name && (
          <p className="text-xs text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-zinc-400 text-xs uppercase tracking-wider font-semibold"
        >
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
            placeholder="voce@empresa.com"
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
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            className={cn("pl-9", inputClass, errors.password && "border-red-500/50")}
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
          Confirmar Senha
        </Label>
        <div className="relative">
          <IconLock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita a senha"
            autoComplete="new-password"
            className={cn("pl-9", inputClass, errors.confirmPassword && "border-red-500/50")}
            {...register("confirmPassword")}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
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
            Criando conta...
          </>
        ) : (
          <>
            Criar conta
            <IconArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-zinc-600">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
