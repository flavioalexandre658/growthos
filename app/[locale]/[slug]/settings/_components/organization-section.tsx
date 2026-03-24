"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  IconBuilding,
  IconTrash,
  IconLoader2,
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPlus,
  IconCopy,
  IconCheck,
  IconKey,
  IconCode,
  IconClock,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { updateOrganization } from "@/actions/organizations/update-organization.action";
import { deleteOrganization } from "@/actions/organizations/delete-organization.action";
import { useApiKeys } from "@/hooks/queries/use-api-keys";
import { useCreateApiKey } from "@/hooks/mutations/use-create-api-key";
import { useDeleteApiKey } from "@/hooks/mutations/use-delete-api-key";
import { AiPromptSection } from "./ai-prompt-section";
import type { IOrganization } from "@/interfaces/organization.interface";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";

dayjs.extend(relativeTime);

function ApiKeyRow({
  id,
  keyValue,
  name,
  createdAt,
  lastUsedAt,
  expiresAt,
  onDelete,
  isDeleting,
}: {
  id: string;
  keyValue: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const t = useTranslations("settings.installation");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = expiresAt && new Date() > expiresAt;
  const expiresLabel = expiresAt
    ? isExpired
      ? t("keyExpired")
      : t("keyExpires", { time: dayjs(expiresAt).locale(dayjsLocale).fromNow() })
    : null;

  const lastUsedLabel = lastUsedAt
    ? t("keyLastUsed", { time: dayjs(lastUsedAt).locale(dayjsLocale).fromNow() })
    : t("keyNeverUsed");

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        isExpired
          ? "border-red-800/50 bg-red-950/20"
          : "border-zinc-800 bg-zinc-900/40",
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 shrink-0 mt-0.5">
        <IconKey
          size={14}
          className={isExpired ? "text-red-400" : "text-indigo-400"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-zinc-200">{name}</p>
          {isExpired && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded-md border border-red-800/40">
              <IconAlertTriangle size={10} />
              {t("keyExpired")}
            </span>
          )}
        </div>
        <p className="font-mono text-xs text-zinc-500 truncate mt-0.5">
          {keyValue}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          <p className="text-[10px] text-zinc-600 flex items-center gap-1">
            <IconClock size={10} />
            {lastUsedLabel}
          </p>
          {expiresLabel && (
            <p
              className={cn(
                "text-[10px] flex items-center gap-1",
                isExpired ? "text-red-500" : "text-zinc-600",
              )}
            >
              <IconClock size={10} />
              {expiresLabel}
            </p>
          )}
          <p className="text-[10px] text-zinc-700">
            {t("keyCreated", { date: dayjs(createdAt).format("DD/MM/YYYY") })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
          title={t("copyKey")}
        >
          {copied ? (
            <IconCheck size={14} className="text-emerald-400" />
          ) : (
            <IconCopy size={14} />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(id)}
          disabled={isDeleting}
          className="h-7 w-7 text-zinc-600 hover:text-red-400"
          title={t("revokeKey")}
        >
          <IconTrash size={14} />
        </Button>
      </div>
    </div>
  );
}

function InstallSnippet({
  apiKey,
  baseUrl,
}: {
  apiKey: string;
  baseUrl: string;
}) {
  const t = useTranslations("settings.installation");
  const [copied, setCopied] = useState(false);
  const snippet = `<script async src="${baseUrl}/tracker.js" data-key="${apiKey}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t("snippetCopiedToast"));
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <IconCode size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold text-zinc-400">HTML</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 gap-1.5 text-xs text-zinc-500 hover:text-zinc-100 px-2"
        >
          {copied ? (
            <IconCheck size={12} className="text-emerald-400" />
          ) : (
            <IconCopy size={12} />
          )}
          {copied ? t("snippetCopied") : t("snippetCopy")}
        </Button>
      </div>
      <pre className="px-4 py-3 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
    </div>
  );
}

function CreateKeyForm({
  orgId,
  orgName,
  keyCount,
  onCreate,
  isCreating,
}: {
  orgId: string;
  orgName: string;
  keyCount: number;
  onCreate: (input: {
    organizationId: string;
    name: string;
    expiresDays: number | undefined;
  }) => void;
  isCreating: boolean;
}) {
  const t = useTranslations("settings.installation");
  const [expiresDays, setExpiresDays] = useState<number | undefined>(undefined);

  const EXPIRY_OPTIONS: { label: string; days: number | undefined }[] = [
    { label: t("expiryNever"), days: undefined },
    { label: t("expiry30Days"), days: 30 },
    { label: t("expiry90Days"), days: 90 },
    { label: t("expiry1Year"), days: 365 },
  ];

  const handleCreate = () => {
    onCreate({
      organizationId: orgId,
      name: `${orgName} Key ${keyCount + 1}`,
      expiresDays,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={expiresDays ?? ""}
        onChange={(e) =>
          setExpiresDays(
            e.target.value === "" ? undefined : Number(e.target.value),
          )
        }
        className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
      >
        {EXPIRY_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.days ?? ""}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={handleCreate}
        disabled={isCreating}
        className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5 text-xs"
      >
        <IconPlus size={13} />
        {t("newKey")}
      </Button>
    </div>
  );
}

function ApiKeysCard({ organization }: { organization: IOrganization }) {
  const t = useTranslations("settings.installation");
  const { data: keys, isLoading } = useApiKeys(organization.id);
  const createMutation = useCreateApiKey(organization.id);
  const deleteMutation = useDeleteApiKey(organization.id);

  const handleCreate = async (input: {
    organizationId: string;
    name: string;
    expiresDays: number | undefined;
  }) => {
    const result = await createMutation.mutateAsync(input);
    if (result?.[0]) {
      toast.success(t("keyCreatedToast"));
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    toast.success(t("keyRevokedToast"));
  };

  const firstActiveKey = keys?.find(
    (k) => k.isActive && (!k.expiresAt || new Date() < k.expiresAt),
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">
            {t("apiKeysTitle")}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t("apiKeysDescription")}
          </p>
        </div>
        {!isLoading && (
          <CreateKeyForm
            orgId={organization.id}
            orgName={organization.name}
            keyCount={keys?.length ?? 0}
            onCreate={handleCreate}
            isCreating={createMutation.isPending}
          />
        )}
      </div>

      <div className="p-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-zinc-800" />
          ))
        ) : keys?.length === 0 ? (
          <p className="text-center py-6 text-zinc-600 text-sm">
            {t("noKeysYet")}
          </p>
        ) : (
          keys?.map((k) => (
            <ApiKeyRow
              key={k.id}
              id={k.id}
              keyValue={k.key}
              name={k.name}
              createdAt={k.createdAt}
              lastUsedAt={k.lastUsedAt}
              expiresAt={k.expiresAt}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}

        {firstActiveKey && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                {t("snippetTitle")}
              </p>
              <InstallSnippet apiKey={firstActiveKey.key} baseUrl="https://groware.io" />
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                {t("snippetHint")}
              </p>
            </div>

            <AiPromptSection
              apiKey={firstActiveKey.key}
              baseUrl="https://groware.io"
              orgName={organization.name}
              currency={organization.currency ?? "BRL"}
              funnelSteps={organization.funnelSteps}
              hasRecurringRevenue={organization.hasRecurringRevenue}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface OrganizationSectionProps {
  organization: IOrganization;
}

export function OrganizationSection({ organization }: OrganizationSectionProps) {
  const t = useTranslations("settings.organization");
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const formSchema = z.object({
    name: z.string().min(2, t("nameValidation")),
    slug: z
      .string()
      .min(2, t("slugValidation"))
      .max(60)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        t("slugRegexValidation"),
      ),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  const slugValue = form.watch("slug");
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://groware.io";

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const updated = await updateOrganization({
        organizationId: organization.id,
        name: data.name,
        slug: data.slug,
      });

      toast.success(t("successUpdated"));

      if (updated.slug !== organization.slug) {
        router.push(`/${updated.slug}/settings/organization`);
      } else {
        form.reset({ name: updated.name, slug: updated.slug });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== organization.name) return;
    setIsDeleting(true);
    try {
      await deleteOrganization({
        organizationId: organization.id,
        confirmationName: deleteConfirmation,
      });
      toast.success(t("successDeleted"));
      router.push("/organizations");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorDelete"));
      setIsDeleting(false);
    }
  };

  const isDeleteConfirmed = deleteConfirmation === organization.name;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 shrink-0">
            <IconBuilding size={15} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              {t("infoTitle")}
            </p>
            <p className="text-xs text-zinc-600">
              {t("infoDescription")}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t("nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("namePlaceholder")}
                      className="bg-zinc-950 border-zinc-700 text-zinc-100 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600/50"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t("slugLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("slugPlaceholder")}
                      className="bg-zinc-950 border-zinc-700 text-zinc-100 font-mono focus-visible:ring-indigo-500/50 focus-visible:border-indigo-600/50"
                      onChange={(e) =>
                        field.onChange(
                          e.target.value.toLowerCase().replace(/\s+/g, "-"),
                        )
                      }
                    />
                  </FormControl>
                  <p className="text-[11px] text-zinc-600 font-mono mt-1">
                    {baseUrl}/
                    <span className="text-indigo-400">
                      {slugValue || "seu-slug"}
                    </span>
                  </p>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isSaving || !form.formState.isDirty}
                className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSaving ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconDeviceFloppy size={14} />
                )}
                {isSaving ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <ApiKeysCard organization={organization} />

      <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-5 space-y-4">
        <div className="flex items-start gap-2.5">
          <IconAlertTriangle
            size={16}
            className="text-red-400 mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-red-300">{t("dangerZoneTitle")}</p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {t("dangerZoneDescription")}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-red-900/30 bg-red-950/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {t("deleteTitle")}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t("deleteDescription")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsDeleteOpen(true)}
            className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/50 border border-red-900/40 shrink-0"
          >
            <IconTrash size={14} />
            {t("deleteButton")}
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-red-400" />
              {t("deleteDialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-zinc-400">
                <p>
                  {t("deleteDialogBody", { permanent: t("deleteDialogPermanent") })
                    .split(t("deleteDialogPermanent"))
                    .map((part, i, arr) =>
                      i < arr.length - 1 ? (
                        <span key={i}>
                          {part}
                          <span className="font-semibold text-red-400">{t("deleteDialogPermanent")}</span>
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                </p>
                <ul className="space-y-1 text-zinc-500 text-xs pl-4 list-disc">
                  <li>{t("deleteDialogItem1")}</li>
                  <li>{t("deleteDialogItem2")}</li>
                  <li>{t("deleteDialogItem3")}</li>
                  <li>{t("deleteDialogItem4")}</li>
                </ul>
                <p className="pt-1">
                  {t("deleteDialogConfirmPrompt", { name: organization.name })
                    .split(organization.name)
                    .map((part, i, arr) =>
                      i < arr.length - 1 ? (
                        <span key={i}>
                          {part}
                          <span className="font-mono font-semibold text-zinc-200">{organization.name}</span>
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder={organization.name}
            className="bg-zinc-950 border-zinc-700 text-zinc-100 font-mono focus-visible:ring-red-500/50 focus-visible:border-red-600/50"
          />

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
              {t("cancel")}
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={!isDeleteConfirmed || isDeleting}
              className="gap-2 bg-red-700 hover:bg-red-600 text-white disabled:opacity-40"
            >
              {isDeleting ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconTrash size={14} />
              )}
              {isDeleting ? t("deletingButton") : t("deleteConfirmButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
