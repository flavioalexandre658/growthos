"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const text = match[2].trim();
    const id = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    headings.push({
      id,
      text,
      level: match[1].length,
    });
  }

  return headings;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const t = useTranslations("blog");
  const headings = extractHeadings(content);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav className="hidden xl:block sticky top-24 w-56 shrink-0 self-start">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        {t("tableOfContents")}
      </p>
      <ul className="space-y-1.5 border-l border-white/[0.06]">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={`block text-[13px] leading-snug transition-colors border-l-2 -ml-px ${
                level === 3 ? "pl-5" : "pl-3"
              } ${
                activeId === id
                  ? "border-indigo-400 text-indigo-400"
                  : "border-transparent text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
