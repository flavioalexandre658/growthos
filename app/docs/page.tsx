import { DocsContent } from "./_components/docs-content";

export const metadata = {
  title: "Documentação | GrowthOS",
};

export default function DocsPage() {
  const serverUrl = process.env.NEXTAUTH_URL ?? "https://growthos.app";

  return (
    <div style={{ height: "calc(100vh - 49px)" }} className="overflow-hidden">
      <DocsContent serverUrl={serverUrl} />
    </div>
  );
}