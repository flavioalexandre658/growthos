"use client";

import { useEffect } from "react";
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
import type { IFixedCost, IVariableCost, CostValueType } from "@/interfaces/cost.interface";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  amountInCents: z.number({ required_error: "Valor é obrigatório" }).positive("Valor deve ser positivo"),
  type: z.enum(["VALUE", "PERCENTAGE"]),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costKind: "fixed" | "variable";
  initialData?: IFixedCost | IVariableCost | null;
  onSubmit: (data: { name: string; amountInCents: number; type: CostValueType; description?: string }) => void;
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
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amountInCents: 0,
      type: costKind === "variable" ? "PERCENTAGE" : "VALUE",
      description: "",
    },
  });

  const watchType = form.watch("type");
  const isEditing = !!initialData;
  const title = `${isEditing ? "Editar" : "Adicionar"} Custo ${costKind === "fixed" ? "Fixo" : "Variável"}`;

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        amountInCents: initialData.amountInCents,
        type: initialData.type,
        description: initialData.description ?? "",
      });
    } else {
      form.reset({
        name: "",
        amountInCents: 0,
        type: costKind === "variable" ? "PERCENTAGE" : "VALUE",
        description: "",
      });
    }
  }, [initialData, costKind, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      amountInCents: data.amountInCents,
      type: data.type,
      description: data.description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Nome</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Aluguel, Plataforma, Impostos..."
                      className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="VALUE" className="text-zinc-200 focus:bg-zinc-800">
                        Valor fixo (R$)
                      </SelectItem>
                      <SelectItem value="PERCENTAGE" className="text-zinc-200 focus:bg-zinc-800">
                        Porcentagem (%)
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                    {watchType === "PERCENTAGE" ? "Porcentagem (ex: 15.5 = 15.5%)" : "Valor"}
                  </FormLabel>
                  <FormControl>
                    {watchType === "PERCENTAGE" ? (
                      <NumericFormat
                        value={field.value / 100}
                        onValueChange={(values) => {
                          field.onChange(Math.round((values.floatValue ?? 0) * 100));
                        }}
                        decimalSeparator=","
                        thousandSeparator="."
                        decimalScale={2}
                        suffix="%"
                        placeholder="Ex: 15,50%"
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
                        placeholder="R$ 0,00"
                        customInput={Input}
                        className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Observações..."
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
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isLoading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
