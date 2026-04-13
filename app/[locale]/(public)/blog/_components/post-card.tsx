import { Link } from "@/i18n/routing";
import { IconClock, IconCalendar } from "@tabler/icons-react";
import type { BlogPost } from "@/utils/blog";

interface PostCardProps {
  post: BlogPost;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}` as "/blog"}
      className="group block rounded-2xl border border-white/[0.04] bg-[#0f0f14] p-6 transition-all hover:border-white/[0.08] hover:bg-[#131319]"
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {post.keywords.slice(0, 3).map((kw) => (
          <span
            key={kw}
            className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-400"
          >
            {kw}
          </span>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-2 font-display">
        {post.title}
      </h2>

      <p className="mt-2 text-sm text-zinc-500 line-clamp-2 leading-relaxed">
        {post.description}
      </p>

      <div className="mt-4 flex items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1">
          <IconCalendar size={13} />
          {new Date(post.date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className="flex items-center gap-1">
          <IconClock size={13} />
          {post.readingTimeMinutes} min
        </span>
      </div>
    </Link>
  );
}
