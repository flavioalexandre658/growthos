"use client";

import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";

export function DocsBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/organizations");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 transition-all hover:bg-zinc-800/80 hover:text-zinc-300"
    >
      <IconArrowLeft size={12} />
      Voltar ao dashboard
    </button>
  );
}
