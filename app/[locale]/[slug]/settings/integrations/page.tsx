"use client";

import { useTranslations } from "next-intl";
import { IconBrandStripe } from "@tabler/icons-react";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { IntegrationCard } from "./_components/integration-card";
import { TrackerCallout } from "./_components/tracker-callout";
import { ComingSoonProviders } from "./_components/coming-soon-providers";
import { connectStripe } from "@/actions/integrations/connect-stripe.action";
import { syncStripeHistory } from "@/actions/integrations/sync-stripe-history.action";
import { connectAsaas } from "@/actions/integrations/connect-asaas.action";
import { syncAsaasHistory } from "@/actions/integrations/sync-asaas-history.action";

const STRIPE_EVENTS = [
  "invoice.payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "invoice.payment_failed",
  "payment_intent.succeeded",
  "charge.refunded",
];

const ASAAS_EVENTS = [
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_REFUNDED",
  "PAYMENT_OVERDUE",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_DELETED",
  "SUBSCRIPTION_INACTIVATED",
];

function AsaasLogoIcon() {
  return (
    <span className="text-[15px] font-bold text-[#00BFA5] leading-none tracking-tight">A</span>
  );
}

function StripeLogoIcon() {
  return <IconBrandStripe size={18} className="text-[#635BFF]" />;
}

export default function IntegrationsPage() {
  const tNav = useTranslations("settings.nav");
  const tStripe = useTranslations("settings.integrations.stripe");
  const tAsaas = useTranslations("settings.integrations.asaas");

  return (
    <SettingsSectionWrapper label={tNav("integrations")} hideCompleteness>
      {(org) => (
        <div className="space-y-4">
          <TrackerCallout />

          <IntegrationCard
            organizationId={org.id}
            config={{
              provider: "stripe",
              providerName: "Stripe",
              accentColor: "#635BFF",
              logo: <StripeLogoIcon />,
              credentialLabel: tStripe("credentialLabel"),
              credentialPlaceholder: tStripe("credentialPlaceholder"),
              connectVia: tStripe("connectVia"),
              howToGetCredential: tStripe("howToGetCredential"),
              tutorialSteps: [
                tStripe("tutorialStep1"),
                tStripe("tutorialStep2"),
                tStripe("tutorialStep3"),
                tStripe("tutorialStep4"),
                tStripe("tutorialStep5"),
                tStripe("tutorialStep6"),
                tStripe("tutorialStep7"),
                tStripe("tutorialStep8"),
                tStripe("tutorialStep9"),
              ],
              dashboardUrl: "https://dashboard.stripe.com/apikeys",
              openDashboardLabel: tStripe("openDashboard"),
              webhookEvents: STRIPE_EVENTS,
              webhookStep1: tStripe("webhookStep1"),
              webhookStep2: tStripe("webhookStep2"),
              webhookStep3: tStripe("webhookStep3"),
              webhookSecretPlaceholder: tStripe("webhookSecretPlaceholder"),
              webhookWarning: tStripe("webhookWarning"),
              toastId: "stripe-sync",
              disconnectConfirm: tStripe("disconnectConfirm"),
              connectedToast: tStripe("connectedToast"),
              connectErrorToast: tStripe("connectErrorToast"),
              disconnectedToast: tStripe("disconnectedToast"),
              onConnect: (orgId, key) => connectStripe(orgId, key),
              onSync: (orgId, integrationId) => syncStripeHistory(orgId, integrationId),
            }}
          />

          <IntegrationCard
            organizationId={org.id}
            config={{
              provider: "asaas",
              providerName: "Asaas",
              accentColor: "#00BFA5",
              logo: <AsaasLogoIcon />,
              credentialLabel: tAsaas("credentialLabel"),
              credentialPlaceholder: tAsaas("credentialPlaceholder"),
              connectVia: tAsaas("connectVia"),
              howToGetCredential: tAsaas("howToGetCredential"),
              tutorialSteps: [
                tAsaas("tutorialStep1"),
                tAsaas("tutorialStep2"),
                tAsaas("tutorialStep3"),
                tAsaas("tutorialStep4"),
              ],
              dashboardUrl: "https://app.asaas.com",
              openDashboardLabel: tAsaas("openDashboard"),
              webhookEvents: ASAAS_EVENTS,
              webhookStep1: tAsaas("webhookStep1"),
              webhookStep2: tAsaas("webhookStep2"),
              webhookStep3: tAsaas("webhookStep3"),
              webhookSecretPlaceholder: tAsaas("webhookSecretPlaceholder"),
              webhookWarning: tAsaas("webhookWarning"),
              toastId: "asaas-sync",
              disconnectConfirm: tAsaas("disconnectConfirm"),
              connectedToast: tAsaas("connectedToast"),
              connectErrorToast: tAsaas("connectErrorToast"),
              disconnectedToast: tAsaas("disconnectedToast"),
              onConnect: (orgId, key) => connectAsaas(orgId, key),
              onSync: (orgId, integrationId) => syncAsaasHistory(orgId, integrationId),
            }}
          />

          <ComingSoonProviders />
        </div>
      )}
    </SettingsSectionWrapper>
  );
}
