"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { IconBuilding, IconLoader2, IconArrowRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization } from "@/actions/organizations/create-organization.action";
import { cn } from "@/lib/utils";
import type { IOrganization } from "@/interfaces/organization.interface";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
});

type FormData = z.infer<typeof schema>;

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

interface StepCreateOrgProps {
  onComplete: (org: IOrganization) => void;
}

export function StepCreateOrg({ onComplete }: StepCreateOrgProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const org = await createOrganization(data);
      toast.success("Organização criada!");
      onComplete(org as IOrganization);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar organização.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30">
            <IconBuilding size={18} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              Criar organização
            </h2>
            <p className="text-xs text-zinc-500">
              Seus dados serão separados por organização
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            Nome
          </Label>
          <Input
            type="text"
            placeholder="Ex: Minha Loja Online"
            className={cn(inputClass, errors.name && "border-red-500/50")}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            Slug (identificador único)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono select-none">
              growthos/
            </span>
            <Input
              type="text"
              placeholder="minha-loja"
              className={cn(
                "pl-[4.5rem] font-mono",
                inputClass,
                errors.slug && "border-red-500/50"
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
              Seus dados serão armazenados sob{" "}
              <code className="text-indigo-400 font-mono">{slugValue}</code>
            </p>
          ) : null}
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
              Criando...
            </>
          ) : (
            <>
              Continuar
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
