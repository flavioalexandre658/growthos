"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  IconBrandStripe,
  IconBolt,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/components/providers/organization-provider";
import { cn } from "@/lib/utils";

const LS_KEY = "groware_gateway_modal_dismissed";

type GatewayId = "stripe" | "asaas" | "kiwify" | "hotmart";

interface GatewayOption {
  id: GatewayId;
  name: string;
  descKey: string;
  color: string;
  logo: React.ReactNode;
  disabled?: boolean;
}

const GATEWAYS: GatewayOption[] = [
  {
    id: "stripe",
    name: "Stripe",
    descKey: "stripeDesc",
    color: "#635BFF",
    logo: <IconBrandStripe size={20} className="text-[#635BFF]" />,
  },
  {
    id: "asaas",
    name: "Asaas",
    descKey: "asaasDesc",
    color: "#00C896",
    logo: (
      <span className="text-[15px] font-bold text-[#00C896] leading-none tracking-tight">
        A
      </span>
    ),
  },
  {
    id: "kiwify",
    name: "Kiwify",
    descKey: "comingSoon",
    color: "#666",
    disabled: true,
    logo: (
      <span className="text-[15px] font-bold text-zinc-600 leading-none tracking-tight">
        K
      </span>
    ),
  },
  {
    id: "hotmart",
    name: "Hotmart",
    descKey: "comingSoon",
    color: "#666",
    disabled: true,
    logo: (
      <span className="text-[15px] font-bold text-zinc-600 leading-none tracking-tight">
        H
      </span>
    ),
  },
];

export function GatewayPromptModal() {
  const t = useTranslations("dashboard.gatewayModal");
  const { organization } = useOrganization();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<GatewayId | null>(null);
  const [hovering, setHovering] = useState<GatewayId | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === "1") return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {}
  };

  const handleConnect = () => {
    dismiss();
    router.push(`/${organization?.slug ?? ""}/settings/integrations`);
  };

  const selectedGateway = GATEWAYS.find((g) => g.id === selected);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="sm:max-w-[480px] p-0 border-white/[0.08] bg-gradient-to-b from-[#141420] to-[#0f0f1a] shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset] rounded-2xl overflow-hidden [&>button]:hidden">
        <div className="p-8 relative">
          <button
            onClick={dismiss}
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <IconX size={14} />
          </button>

          <div className="mb-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/25 mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-violet-400"
              >
                <rect
                  x="2"
                  y="5"
                  width="20"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M2 9h20" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M6 14h4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <DialogTitle className="text-xl font-semibold text-[#f0f0f8] tracking-tight mb-2">
              {t("title")}
            </DialogTitle>
            <p className="text-[13.5px] text-[#5a5a72] leading-relaxed">
              {t("description")}
            </p>
          </div>

          <div className="h-px bg-white/[0.05] mb-5" />

          <p className="text-[11px] font-medium text-[#444458] uppercase tracking-wider mb-3">
            {t("selectLabel")}
          </p>

          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {GATEWAYS.map((g) => {
              const isSelected = selected === g.id;
              const isHovered = hovering === g.id;

              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={g.disabled}
                  onClick={() => setSelected(g.id)}
                  onMouseEnter={() => setHovering(g.id)}
                  onMouseLeave={() => setHovering(null)}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-200",
                    g.disabled && "opacity-40 cursor-default",
                    !g.disabled && "cursor-pointer hover:-translate-y-px",
                  )}
                  style={{
                    borderColor: isSelected
                      ? `${g.color}4D`
                      : isHovered && !g.disabled
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(255,255,255,0.06)",
                    background: isSelected
                      ? `${g.color}14`
                      : isHovered && !g.disabled
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.02)",
                  }}
                >
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ background: g.color }}
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}

                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      backgroundColor: g.disabled
                        ? "rgba(255,255,255,0.03)"
                        : `${g.color}14`,
                      borderColor: g.disabled
                        ? "rgba(255,255,255,0.06)"
                        : `${g.color}30`,
                    }}
                  >
                    {g.logo}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[13.5px] font-medium",
                        g.disabled
                          ? "text-zinc-600"
                          : isSelected
                            ? "text-[#f0f0f8]"
                            : "text-[#b0b0c8]",
                      )}
                    >
                      {g.name}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{
                        color: g.disabled
                          ? "#333"
                          : isSelected
                            ? g.color
                            : "#444458",
                      }}
                    >
                      {t(g.descKey)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="flex items-center gap-2 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 px-3.5 py-2.5 mb-5">
              <IconInfoCircle size={14} className="text-indigo-400 shrink-0" />
              <p className="text-xs text-[#7070a0] leading-relaxed">
                {t("infoStrip")}
              </p>
            </div>
          )}

          <div className="flex gap-2.5">
            <Button
              variant="outline"
              onClick={dismiss}
              className="flex-1 h-11 border-zinc-800 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              {t("skip")}
            </Button>

            <Button
              onClick={handleConnect}
              className="flex-[2] h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2"
            >
              <IconBolt size={14} />
              {selected
                ? t("ctaSelected", { name: selectedGateway?.name ?? "" })
                : t("ctaDefault")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
