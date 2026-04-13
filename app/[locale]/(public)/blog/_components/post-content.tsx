import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { MDXComponents } from "mdx/types";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2
      id={slugify(String(props.children))}
      className="mt-10 mb-4 text-xl font-bold text-zinc-100 font-display scroll-mt-24"
    >
      {props.children}
    </h2>
  ),
  h3: (props) => (
    <h3
      id={slugify(String(props.children))}
      className="mt-8 mb-3 text-lg font-semibold text-zinc-200 font-display scroll-mt-24"
    >
      {props.children}
    </h3>
  ),
  p: (props) => (
    <p className="mb-4 text-zinc-400 leading-relaxed text-[15px]">
      {props.children}
    </p>
  ),
  ul: (props) => (
    <ul className="mb-4 ml-4 space-y-1.5 text-zinc-400 text-[15px] list-disc marker:text-zinc-700">
      {props.children}
    </ul>
  ),
  ol: (props) => (
    <ol className="mb-4 ml-4 space-y-1.5 text-zinc-400 text-[15px] list-decimal marker:text-zinc-600">
      {props.children}
    </ol>
  ),
  li: (props) => <li className="leading-relaxed">{props.children}</li>,
  a: (props) => (
    <a
      href={props.href}
      target={props.href?.startsWith("http") ? "_blank" : undefined}
      rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
    >
      {props.children}
    </a>
  ),
  strong: (props) => (
    <strong className="text-zinc-200 font-semibold">{props.children}</strong>
  ),
  em: (props) => <em className="text-zinc-300 italic">{props.children}</em>,
  blockquote: (props) => (
    <blockquote className="my-6 border-l-2 border-indigo-500/40 pl-4 text-zinc-400 italic">
      {props.children}
    </blockquote>
  ),
  code: (props) => (
    <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-sm font-mono text-indigo-300">
      {props.children}
    </code>
  ),
  pre: (props) => (
    <pre className="my-6 overflow-x-auto rounded-xl bg-zinc-900/80 border border-white/[0.04] p-4 text-sm font-mono text-zinc-300">
      {props.children}
    </pre>
  ),
  hr: () => <hr className="my-8 border-white/[0.06]" />,
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm text-zinc-400 border-collapse">{props.children}</table>
    </div>
  ),
  thead: (props) => (
    <thead className="bg-zinc-900/60">{props.children}</thead>
  ),
  tr: (props) => (
    <tr className="border-b border-white/[0.04] last:border-b-0">{props.children}</tr>
  ),
  th: (props) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider whitespace-nowrap">
      {props.children}
    </th>
  ),
  td: (props) => (
    <td className="px-4 py-3 whitespace-nowrap">{props.children}</td>
  ),
};

interface PostContentProps {
  source: string;
}

export function PostContent({ source }: PostContentProps) {
  return (
    <article className="prose-custom">
      <MDXRemote
        source={source}
        components={mdxComponents}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
      />
    </article>
  );
}
