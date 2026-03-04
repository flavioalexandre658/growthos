"use client";

import {
  IconCode,
  IconWorld,
  IconFilter,
  IconBrain,
  IconBell,
  IconUsers,
} from "@tabler/icons-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "installation",
    label: "Instalação",
    icon: <IconCode size={14} />,
  },
  {
    id: "regional",
    label: "Regional",
    icon: <IconWorld size={14} />,
  },
  {
    id: "funnel",
    label: "Funil",
    icon: <IconFilter size={14} />,
  },
  {
    id: "ai-profile",
    label: "Perfil IA",
    icon: <IconBrain size={14} />,
  },
  {
    id: "notifications",
    label: "Notificações",
    icon: <IconBell size={14} />,
  },
  {
    id: "team",
    label: "Equipe",
    icon: <IconUsers size={14} />,
  },
];

interface SettingsNavProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
  unsavedSections?: Set<string>;
}

export function SettingsNav({
  activeSection,
  onSectionChange,
  unsavedSections = new Set(),
}: SettingsNavProps) {
  return (
    <>
      <nav className="hidden lg:flex flex-col gap-1 sticky top-6 w-44 shrink-0 pt-1">
        {SETTINGS_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          const hasUnsaved = unsavedSections.has(section.id);
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-left transition-all",
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900",
              )}
            >
              <span
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-indigo-400" : "text-zinc-600",
                )}
              >
                {section.icon}
              </span>
              <span className="flex-1">{section.label}</span>
              {hasUnsaved && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="lg:hidden sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 -mx-5 px-5 mb-4">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 py-2.5 w-max">
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              const hasUnsaved = unsavedSections.has(section.id);
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      isActive ? "text-indigo-400" : "text-zinc-600",
                    )}
                  >
                    {section.icon}
                  </span>
                  {section.label}
                  {hasUnsaved && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
