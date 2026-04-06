"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { IntegrationCard, ComingSoonCard } from "./_components/integration-card";
import { TrackerCallout } from "./_components/tracker-callout";
import { connectStripe } from "@/actions/integrations/connect-stripe.action";
import { syncStripeHistory } from "@/actions/integrations/sync-stripe-history.action";
import { connectAsaas } from "@/actions/integrations/connect-asaas.action";
import { syncAsaasHistory } from "@/actions/integrations/sync-asaas-history.action";
import type { IntegrationDrawerConfig } from "./_components/integration-types";

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
    <Image
      src="/assets/images/gateways/asaas.png"
      alt="Asaas"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function StripeLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/stripe.png"
      alt="Stripe"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function KiwifyLogoIcon() {
  return (
    <span className="text-[15px] font-bold text-[#7C3AED] leading-none tracking-tight">K</span>
  );
}

function HotmartLogoIcon() {
  return (
    <span className="text-[15px] font-bold text-[#F04E23] leading-none tracking-tight">H</span>
  );
}

export default function IntegrationsPage() {
  const tNav = useTranslations("settings.nav");
  const t = useTranslations("settings.integrations");
  const tStripe = useTranslations("settings.integrations.stripe");
  const tAsaas = useTranslations("settings.integrations.asaas");

  return (
    <SettingsSectionWrapper label={tNav("integrations")} hideCompleteness>
      {(org) => {
        const stripeConfig: IntegrationDrawerConfig = {
          provider: "stripe",
          providerName: "Stripe",
          tagline: t("stripeTagline"),
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
        };

        const asaasConfig: IntegrationDrawerConfig = {
          provider: "asaas",
          providerName: "Asaas",
          tagline: t("asaasTagline"),
          accentColor: "#00BFA5",
          logo: <AsaasLogoIcon />,
          badge: t("mostUsedBadge"),
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
        };

        return (
          <div className="space-y-5">
            <TrackerCallout />

            <div>
              <h2 className="text-sm font-semibold text-zinc-200 mb-1">{t("title")}</h2>
              <p className="text-xs text-zinc-500 mb-4">{t("subtitle")}</p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <IntegrationCard organizationId={org.id} config={asaasConfig} />
                <IntegrationCard organizationId={org.id} config={stripeConfig} />
                <ComingSoonCard
                  name="Kiwify"
                  tagline={t("kiwifyTagline")}
                  accentColor="#7C3AED"
                  logo={<KiwifyLogoIcon />}
                  comingSoonLabel={t("comingSoon")}
                />
                <ComingSoonCard
                  name="Hotmart"
                  tagline={t("hotmartTagline")}
                  accentColor="#F04E23"
                  logo={<HotmartLogoIcon />}
                  comingSoonLabel={t("comingSoon")}
                />
              </div>
            </div>
          </div>
        );
      }}
    </SettingsSectionWrapper>
  );
}
