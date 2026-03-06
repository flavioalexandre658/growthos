import Link from "next/link";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { IconChartBar, IconRosetteDiscountCheck } from "@tabler/icons-react";

interface PublicFooterProps {
  verified: boolean;
  updatedAt: string;
}

export function PublicFooter({ verified, updatedAt }: PublicFooterProps) {
  const updated = dayjs(updatedAt).locale("pt-br").format("DD MMM YYYY, HH:mm");

  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800/50">
      <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
        {verified && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400/80">
            <IconRosetteDiscountCheck size={11} />
            Verificado via Stripe
          </span>
        )}
        <span className="text-[10px] text-zinc-700 font-mono">
          atualizado {updated}
        </span>
      </div>

      <Link
        href="/"
        className="flex items-center gap-1.5 text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
      >
        <IconChartBar size={11} />
        <span className="font-medium">Groware</span>
      </Link>
    </footer>
  );
}
