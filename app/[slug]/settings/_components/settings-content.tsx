"use client";

import { useCallback, useState } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { Skeleton } from "@/components/ui/skeleton";

import { SettingsNav, SETTINGS_SECTIONS } from "./settings-nav";
import { SettingsCompleteness } from "./settings-completeness";
import { InstallationSection } from "./installation-section";
import { RegionalSection } from "./regional-section";
import { ExchangeRatesSection } from "./exchange-rates-section";
import { FunnelStepsSection } from "./funnel-steps-section";
import { AiProfileSection } from "./ai-profile-section";
import { NotificationsSection } from "./notifications-section";
import { TeamSection } from "./team-section";

export function SettingsContent() {
  const { organization, isLoading } = useOrganization();
  const [activeSection, setActiveSection] = useState(SETTINGS_SECTIONS[0].id);
  const [unsavedSections, setUnsavedSections] = useState<Set<string>>(
    new Set(),
  );

  const handleSectionChange = useCallback((id: string) => {
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const markUnsaved = useCallback((sectionId: string) => {
    setUnsavedSections((prev) => new Set(prev).add(sectionId));
  }, []);

  const markSaved = useCallback((sectionId: string) => {
    setUnsavedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  }, []);

  const activeLabel = SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label ?? "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Configurações</h1>
        <p className="text-xs text-zinc-500">
          Gerencie a organização, integrações e preferências
        </p>
      </div>

      <div className="flex gap-8 items-start">
        <SettingsNav
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          unsavedSections={unsavedSections}
        />

        <div className="flex-1 min-w-0 space-y-5">
          {isLoading ? (
            <>
              <Skeleton className="h-28 w-full rounded-xl bg-zinc-800" />
              <Skeleton className="h-48 w-full rounded-xl bg-zinc-800" />
              <Skeleton className="h-48 w-full rounded-xl bg-zinc-800" />
            </>
          ) : organization ? (
            <>
              {activeSection !== "installation" && (
                <SettingsCompleteness
                  organization={organization}
                  onSectionChange={handleSectionChange}
                />
              )}

              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">
                  {activeLabel}
                </p>

                {activeSection === "installation" && (
                  <InstallationSection
                    orgId={organization.id}
                    orgName={organization.name}
                  />
                )}

                {activeSection === "regional" && (
                  <div className="space-y-4">
                    <RegionalSection
                      orgId={organization.id}
                      currentTimezone={organization.timezone ?? "America/Sao_Paulo"}
                      currentCurrency={organization.currency ?? "BRL"}
                      currentLocale={organization.locale ?? "pt-BR"}
                      currentCountry={organization.country ?? "BR"}
                      currentLanguage={organization.language ?? "pt-BR"}
                    />
                    <ExchangeRatesSection
                      orgId={organization.id}
                      baseCurrency={organization.currency ?? "BRL"}
                    />
                  </div>
                )}

                {activeSection === "funnel" && (
                  <FunnelStepsSection
                    orgId={organization.id}
                    initialSteps={organization.funnelSteps}
                  />
                )}

                {activeSection === "ai-profile" && (
                  <AiProfileSection
                    orgId={organization.id}
                    initialProfile={organization.aiProfile}
                  />
                )}

                {activeSection === "notifications" && (
                  <NotificationsSection orgId={organization.id} />
                )}

                {activeSection === "team" && (
                  <TeamSection orgId={organization.id} />
                )}
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-zinc-600 text-sm">
              Organização não encontrada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
