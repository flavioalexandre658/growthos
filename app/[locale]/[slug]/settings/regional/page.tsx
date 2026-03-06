"use client";

import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { RegionalSection } from "../_components/regional-section";
import { ExchangeRatesSection } from "../_components/exchange-rates-section";


export default function RegionalPage() {
  return (
    <SettingsSectionWrapper label="Regional">
      {(org) => (
        <div className="space-y-4">
          <RegionalSection
            orgId={org.id}
            currentTimezone={org.timezone ?? "America/Sao_Paulo"}
            currentCurrency={org.currency ?? "BRL"}
            currentLocale={org.locale ?? "pt-BR"}
            currentCountry={org.country ?? "BR"}
            currentLanguage={org.language ?? "pt-BR"}
          />
          <ExchangeRatesSection
            orgId={org.id}
            baseCurrency={org.currency ?? "BRL"}
          />
        </div>
      )}
    </SettingsSectionWrapper>
  );
}
