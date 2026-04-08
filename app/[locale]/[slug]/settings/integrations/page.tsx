"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { SettingsSectionWrapper } from "../_components/settings-section-wrapper";
import { IntegrationCard } from "./_components/integration-card";
import { TrackerCallout } from "./_components/tracker-callout";
import { connectStripe } from "@/actions/integrations/connect-stripe.action";
import { syncStripeHistory } from "@/actions/integrations/sync-stripe-history.action";
import { connectAsaas } from "@/actions/integrations/connect-asaas.action";
import { syncAsaasHistory } from "@/actions/integrations/sync-asaas-history.action";
import { connectKiwify } from "@/actions/integrations/connect-kiwify.action";
import { syncKiwifyHistory } from "@/actions/integrations/sync-kiwify-history.action";
import { connectHotmart } from "@/actions/integrations/connect-hotmart.action";
import { syncHotmartHistory } from "@/actions/integrations/sync-hotmart-history.action";
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

const KIWIFY_EVENTS = [
  "compra_aprovada",
  "compra_reembolsada",
  "chargeback",
  "subscription_renewed",
  "subscription_canceled",
  "subscription_late",
];

const HOTMART_EVENTS = [
  "PURCHASE_APPROVED",
  "PURCHASE_COMPLETE",
  "PURCHASE_REFUNDED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_CANCELED",
  "PURCHASE_DELAYED",
  "PURCHASE_EXPIRED",
  "SUBSCRIPTION_CANCELLATION",
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
    <Image
      src="/assets/images/gateways/kiwify.png"
      alt="Kiwify"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function HotmartLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/hotmart.png"
      alt="Hotmart"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

export default function IntegrationsPage() {
  const tNav = useTranslations("settings.nav");
  const t = useTranslations("settings.integrations");
  const tStripe = useTranslations("settings.integrations.stripe");
  const tAsaas = useTranslations("settings.integrations.asaas");
  const tKiwify = useTranslations("settings.integrations.kiwify");
  const tHotmart = useTranslations("settings.integrations.hotmart");

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
          onConnect: (orgId, key) => connectStripe(orgId, key as string),
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
          onConnect: (orgId, key) => connectAsaas(orgId, key as string),
          onSync: (orgId, integrationId) => syncAsaasHistory(orgId, integrationId),
        };

        const kiwifyConfig: IntegrationDrawerConfig = {
          provider: "kiwify",
          providerName: "Kiwify",
          tagline: t("kiwifyTagline"),
          accentColor: "#7C3AED",
          logo: <KiwifyLogoIcon />,
          credentialLabel: tKiwify("credentialLabel"),
          credentialPlaceholder: tKiwify("clientIdPlaceholder"),
          credentialFields: [
            {
              key: "clientId",
              label: tKiwify("clientIdLabel"),
              placeholder: tKiwify("clientIdPlaceholder"),
            },
            {
              key: "clientSecret",
              label: tKiwify("clientSecretLabel"),
              placeholder: tKiwify("clientSecretPlaceholder"),
            },
            {
              key: "accountId",
              label: tKiwify("accountIdLabel"),
              placeholder: tKiwify("accountIdPlaceholder"),
              type: "text",
            },
          ],
          connectVia: tKiwify("connectVia"),
          howToGetCredential: tKiwify("howToGetCredential"),
          tutorialSteps: [
            tKiwify("tutorialStep1"),
            tKiwify("tutorialStep2"),
            tKiwify("tutorialStep3"),
            tKiwify("tutorialStep4"),
            tKiwify("tutorialStep5"),
          ],
          dashboardUrl: "https://dashboard.kiwify.com.br/apps",
          openDashboardLabel: tKiwify("openDashboard"),
          webhookEvents: KIWIFY_EVENTS,
          webhookStep1: tKiwify("webhookStep1"),
          webhookStep2: tKiwify("webhookStep2"),
          webhookStep3: tKiwify("webhookStep3"),
          webhookSecretPlaceholder: tKiwify("webhookSecretPlaceholder"),
          webhookWarning: tKiwify("webhookWarning"),
          toastId: "kiwify-sync",
          disconnectConfirm: tKiwify("disconnectConfirm"),
          connectedToast: tKiwify("connectedToast"),
          connectErrorToast: tKiwify("connectErrorToast"),
          disconnectedToast: tKiwify("disconnectedToast"),
          onConnect: (orgId, cred) => {
            const c = cred as Record<string, string>;
            return connectKiwify(orgId, {
              clientId: c.clientId,
              clientSecret: c.clientSecret,
              accountId: c.accountId,
            });
          },
          onSync: (orgId, integrationId) => syncKiwifyHistory(orgId, integrationId),
        };

        const hotmartConfig: IntegrationDrawerConfig = {
          provider: "hotmart",
          providerName: "Hotmart",
          tagline: t("hotmartTagline"),
          accentColor: "#F04E23",
          logo: <HotmartLogoIcon />,
          credentialLabel: tHotmart("credentialLabel"),
          credentialPlaceholder: tHotmart("clientIdPlaceholder"),
          credentialFields: [
            {
              key: "clientId",
              label: tHotmart("clientIdLabel"),
              placeholder: tHotmart("clientIdPlaceholder"),
            },
            {
              key: "clientSecret",
              label: tHotmart("clientSecretLabel"),
              placeholder: tHotmart("clientSecretPlaceholder"),
            },
          ],
          connectVia: tHotmart("connectVia"),
          howToGetCredential: tHotmart("howToGetCredential"),
          tutorialSteps: [
            tHotmart("tutorialStep1"),
            tHotmart("tutorialStep2"),
            tHotmart("tutorialStep3"),
            tHotmart("tutorialStep4"),
            tHotmart("tutorialStep5"),
          ],
          dashboardUrl: "https://app-vlc.hotmart.com/tools/webhook",
          openDashboardLabel: tHotmart("openDashboard"),
          webhookEvents: HOTMART_EVENTS,
          webhookStep1: tHotmart("webhookStep1"),
          webhookStep2: tHotmart("webhookStep2"),
          webhookStep3: tHotmart("webhookStep3"),
          webhookSecretPlaceholder: tHotmart("webhookSecretPlaceholder"),
          webhookWarning: tHotmart("webhookWarning"),
          toastId: "hotmart-sync",
          disconnectConfirm: tHotmart("disconnectConfirm"),
          connectedToast: tHotmart("connectedToast"),
          connectErrorToast: tHotmart("connectErrorToast"),
          disconnectedToast: tHotmart("disconnectedToast"),
          onConnect: (orgId, cred) => {
            const c = cred as Record<string, string>;
            return connectHotmart(orgId, {
              clientId: c.clientId,
              clientSecret: c.clientSecret,
            });
          },
          onSync: (orgId, integrationId) => syncHotmartHistory(orgId, integrationId),
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
                <IntegrationCard organizationId={org.id} config={kiwifyConfig} />
                <IntegrationCard organizationId={org.id} config={hotmartConfig} />
              </div>
            </div>
          </div>
        );
      }}
    </SettingsSectionWrapper>
  );
}
