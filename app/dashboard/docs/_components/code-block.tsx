"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  lang?: string;
  title?: string;
  className?: string;
}

export function CodeBlock({
  code,
  lang = "js",
  title,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 overflow-hidden",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/50">
          <span className="text-xs text-muted-foreground font-mono">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono py-0">
              {lang}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <IconCheck className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <IconCopy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}
