import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

export interface BlogPost {
  slug: string;
  locale: string;
  title: string;
  description: string;
  date: string;
  keywords: string[];
  author: string;
  readingTime: string;
  readingTimeMinutes: number;
  content: string;
}

interface BlogPostFrontmatter {
  title: string;
  description: string;
  date: string;
  slug: string;
  keywords?: string[];
  author?: string;
}

function getContentDir(locale: string): string {
  return path.join(process.cwd(), "content", "blog", locale);
}

function parsePost(filePath: string, locale: string): BlogPost {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const fm = data as BlogPostFrontmatter;
  const stats = readingTime(content);

  return {
    slug: fm.slug,
    locale,
    title: fm.title,
    description: fm.description,
    date: fm.date,
    keywords: fm.keywords ?? [],
    author: fm.author ?? "Groware",
    readingTime: stats.text,
    readingTimeMinutes: Math.ceil(stats.minutes),
    content,
  };
}

export function getAllPosts(locale: string): BlogPost[] {
  const dir = getContentDir(locale);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parsePost(path.join(dir, f), locale))
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostBySlug(slug: string, locale: string): BlogPost | null {
  const dir = getContentDir(locale);
  const filePath = path.join(dir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  return parsePost(filePath, locale);
}

export function getAllSlugs(): { slug: string; locale: string }[] {
  const locales = ["pt", "en"];
  const result: { slug: string; locale: string }[] = [];

  for (const locale of locales) {
    const dir = getContentDir(locale);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".mdx")) continue;
      result.push({ slug: file.replace(/\.mdx$/, ""), locale });
    }
  }

  return result;
}
