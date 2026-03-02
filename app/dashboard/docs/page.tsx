import { Badge } from "@/components/ui/badge";
import { DocsContent } from "./_components/docs-content";

export default function DocsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="border-b border-border px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-semibold tracking-tight">
              Tracker Docs
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              v1.0
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Guia de integração do{" "}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              tracker.js
            </code>{" "}
            para devs
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-8">
        <DocsContent />
      </div>
    </div>
  );
}
