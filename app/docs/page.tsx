import { DocsContent } from "./_components/docs-content";

export const metadata = {
  title: "Documentação",
};

export default function DocsPage() {
  const serverUrl = process.env.NEXTAUTH_URL ?? "https://groware.io";

  return (
    <div style={{ height: "calc(100vh - 49px)" }} className="overflow-hidden">
      <DocsContent serverUrl={serverUrl} />
    </div>
  );
}