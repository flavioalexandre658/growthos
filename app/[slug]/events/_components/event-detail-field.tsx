"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 shrink-0 p-0.5 rounded text-zinc-700 hover:text-zinc-300 transition-colors"
      title="Copiar"
    >
      {copied ? (
        <IconCheck size={11} className="text-emerald-400" />
      ) : (
        <IconCopy size={11} />
      )}
    </button>
  );
}

export interface DetailFieldProps {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  dim?: boolean;
}

export function DetailField({ label, value, mono = false, copyable = false, dim = false }: DetailFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600 shrink-0 w-[100px]">
        {label}
      </span>
      <div className="flex items-center gap-0 flex-1 min-w-0 justify-end">
        <span
          className={cn(
            "text-xs truncate",
            mono ? "font-mono" : "",
            dim ? "text-zinc-700" : "text-zinc-300"
          )}
          title={value}
        >
          {value}
        </span>
        {copyable && <CopyButton value={value} />}
      </div>
    </div>
  );
}
