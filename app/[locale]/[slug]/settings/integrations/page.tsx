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
import { connectMercadoPago } from "@/actions/integrations/connect-mercadopago.action";
import { syncMercadoPagoHistory } from "@/actions/integrations/sync-mercadopago-history.action";
import { connectPagarme } from "@/actions/integrations/connect-pagarme.action";
import { syncPagarmeHistory } from "@/actions/integrations/sync-pagarme-history.action";
import { connectMonetizze } from "@/actions/integrations/connect-monetizze.action";
import { syncMonetizzeHistory } from "@/actions/integrations/sync-monetizze-history.action";
import { connectPagBank } from "@/actions/integrations/connect-pagbank.action";
import { syncPagBankHistory } from "@/actions/integrations/sync-pagbank-history.action";
import { connectGuru } from "@/actions/integrations/connect-guru.action";
import { syncGuruHistory } from "@/actions/integrations/sync-guru-history.action";
import { connectPaypal } from "@/actions/integrations/connect-paypal.action";
import { syncPaypalHistory } from "@/actions/integrations/sync-paypal-history.action";
import { connectEduzz } from "@/actions/integrations/connect-eduzz.action";
import { syncEduzzHistory } from "@/actions/integrations/sync-eduzz-history.action";
import { connectCakto } from "@/actions/integrations/connect-cakto.action";
import { syncCaktoHistory } from "@/actions/integrations/sync-cakto-history.action";
import { connectKirvano } from "@/actions/integrations/connect-kirvano.action";
import { syncKirvanoHistory } from "@/actions/integrations/sync-kirvano-history.action";
import { connectAbacatePay } from "@/actions/integrations/connect-abacatepay.action";
import { syncAbacatePayHistory } from "@/actions/integrations/sync-abacatepay-history.action";
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
  "Compra aprovada",
  "Reembolso",
  "Chargeback",
  "Assinatura renovada",
  "Assinatura cancelada",
  "Assinatura atrasada",
];

const HOTMART_EVENTS = [
  "Compra aprovada",
  "Compra reembolsada",
  "Chargeback",
  "Compra atrasada",
  "Cancelamento de Assinatura",
];

const MERCADOPAGO_EVENTS = [
  "payment",
  "subscription_preapproval",
  "subscription_authorized_payment",
];

const PAGARME_EVENTS = [
  "order.paid",
  "order.canceled",
  "order.payment_failed",
  "charge.paid",
  "charge.refunded",
  "charge.chargedback",
  "subscription.created",
  "subscription.canceled",
  "subscription.charges_paid",
  "subscription.charges_payment_failed",
];

const MONETIZZE_EVENTS = ["Todos os eventos"];

const PAGBANK_EVENTS = [
  "Pagamento aprovado (PAID)",
  "Pagamento cancelado (CANCELED)",
  "Pagamento devolvido (REFUNDED)",
];

const GURU_EVENTS = [
  "Aprovada",
  "Cancelada",
  "Completa",
  "Reembolsada",
  "Reclamada",
];

const PAYPAL_EVENTS = [
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.REFUNDED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
];

const EDUZZ_EVENTS = [
  "Fatura paga (invoice_paid)",
  "Fatura cancelada (invoice_canceled)",
  "Fatura reembolsada (invoice_refunded)",
  "Contrato cancelado (contract_canceled)",
];

const CAKTO_EVENTS = [
  "Compra aprovada",
  "Reembolso",
  "Chargeback",
];

const KIRVANO_EVENTS = [
  "Venda aprovada",
  "Venda recusada",
  "Chargeback",
];

const ABACATEPAY_EVENTS = [
  "checkout.completed",
  "checkout.refunded",
  "checkout.disputed",
  "subscription.completed",
  "subscription.cancelled",
  "subscription.renewed",
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

function MercadoPagoLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/mercadopago.png"
      alt="Mercado Pago"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function PagarmeLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/pagarme.png"
      alt="Pagar.me"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function MonetizzeLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/monetizze.png"
      alt="Monetizze"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function PagBankLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/pagbank.png"
      alt="PagBank"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function GuruLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/guru.png"
      alt="Guru"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function PayPalLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/paypal.png"
      alt="PayPal"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function EduzzLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/eduzz.png"
      alt="Eduzz"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function CaktoLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/cakto.png"
      alt="Cakto"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function KirvanoLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/kirvano.png"
      alt="Kirvano"
      width={28}
      height={28}
      className="object-contain"
    />
  );
}

function AbacatePayLogoIcon() {
  return (
    <Image
      src="/assets/images/gateways/abacatepay.png"
      alt="Abacate Pay"
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
  const tMercadoPago = useTranslations("settings.integrations.mercadopago");
  const tPagarme = useTranslations("settings.integrations.pagarme");
  const tMonetizze = useTranslations("settings.integrations.monetizze");
  const tPagBank = useTranslations("settings.integrations.pagbank");
  const tGuru = useTranslations("settings.integrations.guru");
  const tPayPal = useTranslations("settings.integrations.paypal");
  const tEduzz = useTranslations("settings.integrations.eduzz");
  const tCakto = useTranslations("settings.integrations.cakto");
  const tKirvano = useTranslations("settings.integrations.kirvano");
  const tAbacatePay = useTranslations("settings.integrations.abacatepay");

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
              key: "clientSecret",
              label: tKiwify("clientSecretLabel"),
              placeholder: tKiwify("clientSecretPlaceholder"),
            },
            {
              key: "clientId",
              label: tKiwify("clientIdLabel"),
              placeholder: tKiwify("clientIdPlaceholder"),
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
            tKiwify("tutorialStep6"),
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
            tHotmart("tutorialStep6"),
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

        const mercadoPagoConfig: IntegrationDrawerConfig = {
          provider: "mercadopago",
          providerName: "Mercado Pago",
          tagline: t("mercadopagoTagline"),
          accentColor: "#00B1EA",
          logo: <MercadoPagoLogoIcon />,
          credentialLabel: tMercadoPago("credentialLabel"),
          credentialPlaceholder: tMercadoPago("credentialPlaceholder"),
          connectVia: tMercadoPago("connectVia"),
          howToGetCredential: tMercadoPago("howToGetCredential"),
          tutorialSteps: [
            tMercadoPago("tutorialStep1"),
            tMercadoPago("tutorialStep2"),
            tMercadoPago("tutorialStep3"),
            tMercadoPago("tutorialStep4"),
            tMercadoPago("tutorialStep5"),
            tMercadoPago("tutorialStep6"),
            tMercadoPago("tutorialStep7"),
            tMercadoPago("tutorialStep8"),
            tMercadoPago("tutorialStep9"),
            tMercadoPago("tutorialStep10"),
            tMercadoPago("tutorialStep11"),
            tMercadoPago("tutorialStep12"),
            tMercadoPago("tutorialStep13"),
            tMercadoPago("tutorialStep14"),
            tMercadoPago("tutorialStep15"),
            tMercadoPago("tutorialStep16"),
            tMercadoPago("tutorialStep17"),
          ],
          dashboardUrl: "https://www.mercadopago.com.br/developers/panel/app",
          openDashboardLabel: tMercadoPago("openDashboard"),
          webhookEvents: MERCADOPAGO_EVENTS,
          webhookStep1: tMercadoPago("webhookStep1"),
          webhookStep2: tMercadoPago("webhookStep2"),
          webhookStep3: tMercadoPago("webhookStep3"),
          webhookSecretPlaceholder: tMercadoPago("webhookSecretPlaceholder"),
          webhookWarning: tMercadoPago("webhookWarning"),
          toastId: "mercadopago-sync",
          disconnectConfirm: tMercadoPago("disconnectConfirm"),
          connectedToast: tMercadoPago("connectedToast"),
          connectErrorToast: tMercadoPago("connectErrorToast"),
          disconnectedToast: tMercadoPago("disconnectedToast"),
          onConnect: (orgId, key) => connectMercadoPago(orgId, key as string),
          onSync: (orgId, integrationId) => syncMercadoPagoHistory(orgId, integrationId),
        };

        const pagarmeConfig: IntegrationDrawerConfig = {
          provider: "pagarme",
          providerName: "Pagar.me",
          tagline: t("pagarmeTagline"),
          accentColor: "#65A300",
          logo: <PagarmeLogoIcon />,
          credentialLabel: tPagarme("credentialLabel"),
          credentialPlaceholder: tPagarme("credentialPlaceholder"),
          connectVia: tPagarme("connectVia"),
          howToGetCredential: tPagarme("howToGetCredential"),
          tutorialSteps: [
            tPagarme("tutorialStep1"),
            tPagarme("tutorialStep2"),
            tPagarme("tutorialStep3"),
            tPagarme("tutorialStep4"),
            tPagarme("tutorialStep5"),
            tPagarme("tutorialStep6"),
            tPagarme("tutorialStep7"),
          ],
          dashboardUrl: "https://dashboard.pagar.me/",
          openDashboardLabel: tPagarme("openDashboard"),
          webhookEvents: PAGARME_EVENTS,
          webhookStep1: tPagarme("webhookStep1"),
          webhookStep2: tPagarme("webhookStep2"),
          webhookStep3: tPagarme("webhookStep3"),
          webhookSecretPlaceholder: tPagarme("webhookSecretPlaceholder"),
          webhookWarning: tPagarme("webhookWarning"),
          toastId: "pagarme-sync",
          disconnectConfirm: tPagarme("disconnectConfirm"),
          connectedToast: tPagarme("connectedToast"),
          connectErrorToast: tPagarme("connectErrorToast"),
          disconnectedToast: tPagarme("disconnectedToast"),
          onConnect: (orgId, key) => connectPagarme(orgId, key as string),
          onSync: (orgId, integrationId) => syncPagarmeHistory(orgId, integrationId),
        };

        const monetizzeConfig: IntegrationDrawerConfig = {
          provider: "monetizze",
          providerName: "Monetizze",
          tagline: t("monetizzeTagline"),
          accentColor: "#FF6600",
          logo: <MonetizzeLogoIcon />,
          credentialLabel: tMonetizze("credentialLabel"),
          credentialPlaceholder: tMonetizze("credentialPlaceholder"),
          connectVia: tMonetizze("connectVia"),
          howToGetCredential: tMonetizze("howToGetCredential"),
          tutorialSteps: [
            tMonetizze("tutorialStep1"),
            tMonetizze("tutorialStep2"),
            tMonetizze("tutorialStep3"),
          ],
          dashboardUrl: "https://app.monetizze.com.br",
          openDashboardLabel: tMonetizze("openDashboard"),
          webhookEvents: MONETIZZE_EVENTS,
          webhookStep1: tMonetizze("webhookStep1"),
          webhookStep2: tMonetizze("webhookStep2"),
          webhookStep3: tMonetizze("webhookStep3"),
          webhookSecretPlaceholder: tMonetizze("webhookSecretPlaceholder"),
          webhookWarning: tMonetizze("webhookWarning"),
          toastId: "monetizze-sync",
          disconnectConfirm: tMonetizze("disconnectConfirm"),
          connectedToast: tMonetizze("connectedToast"),
          connectErrorToast: tMonetizze("connectErrorToast"),
          disconnectedToast: tMonetizze("disconnectedToast"),
          onConnect: (orgId, key) => connectMonetizze(orgId, key as string),
          onSync: (orgId, integrationId) => syncMonetizzeHistory(orgId, integrationId),
        };

        const pagbankConfig: IntegrationDrawerConfig = {
          provider: "pagbank",
          providerName: "PagBank",
          tagline: t("pagbankTagline"),
          accentColor: "#00A651",
          logo: <PagBankLogoIcon />,
          credentialLabel: tPagBank("credentialLabel"),
          credentialPlaceholder: tPagBank("credentialPlaceholder"),
          connectVia: tPagBank("connectVia"),
          howToGetCredential: tPagBank("howToGetCredential"),
          tutorialSteps: [
            tPagBank("tutorialStep1"),
            tPagBank("tutorialStep2"),
            tPagBank("tutorialStep3"),
            tPagBank("tutorialStep4"),
            tPagBank("tutorialStep5"),
          ],
          dashboardUrl: "https://acesso.pagseguro.uol.com.br",
          openDashboardLabel: tPagBank("openDashboard"),
          webhookEvents: PAGBANK_EVENTS,
          webhookStep1: tPagBank("webhookStep1"),
          webhookStep2: tPagBank("webhookStep2"),
          webhookStep3: tPagBank("webhookStep3"),
          webhookSecretPlaceholder: tPagBank("webhookSecretPlaceholder"),
          webhookWarning: tPagBank("webhookWarning"),
          toastId: "pagbank-sync",
          disconnectConfirm: tPagBank("disconnectConfirm"),
          connectedToast: tPagBank("connectedToast"),
          connectErrorToast: tPagBank("connectErrorToast"),
          disconnectedToast: tPagBank("disconnectedToast"),
          onConnect: (orgId, key) => connectPagBank(orgId, key as string),
          onSync: (orgId, integrationId) => syncPagBankHistory(orgId, integrationId),
        };

        const guruConfig: IntegrationDrawerConfig = {
          provider: "guru",
          providerName: "Guru",
          tagline: t("guruTagline"),
          accentColor: "#4A90D9",
          logo: <GuruLogoIcon />,
          credentialLabel: tGuru("credentialLabel"),
          credentialPlaceholder: tGuru("credentialPlaceholder"),
          connectVia: tGuru("connectVia"),
          howToGetCredential: tGuru("howToGetCredential"),
          tutorialSteps: [
            tGuru("tutorialStep1"),
            tGuru("tutorialStep2"),
            tGuru("tutorialStep3"),
            tGuru("tutorialStep4"),
          ],
          dashboardUrl: "https://digitalmanager.guru",
          openDashboardLabel: tGuru("openDashboard"),
          webhookEvents: GURU_EVENTS,
          webhookStep1: tGuru("webhookStep1"),
          webhookStep2: tGuru("webhookStep2"),
          webhookStep3: tGuru("webhookStep3"),
          webhookSecretPlaceholder: tGuru("webhookSecretPlaceholder"),
          webhookWarning: tGuru("webhookWarning"),
          toastId: "guru-sync",
          disconnectConfirm: tGuru("disconnectConfirm"),
          connectedToast: tGuru("connectedToast"),
          connectErrorToast: tGuru("connectErrorToast"),
          disconnectedToast: tGuru("disconnectedToast"),
          onConnect: (orgId, key) => connectGuru(orgId, key as string),
          onSync: (orgId, integrationId) => syncGuruHistory(orgId, integrationId),
        };

        const paypalConfig: IntegrationDrawerConfig = {
          provider: "paypal",
          providerName: "PayPal",
          tagline: t("paypalTagline"),
          accentColor: "#003087",
          logo: <PayPalLogoIcon />,
          credentialLabel: tPayPal("clientIdLabel"),
          credentialPlaceholder: tPayPal("clientIdPlaceholder"),
          credentialFields: [
            {
              key: "clientId",
              label: tPayPal("clientIdLabel"),
              placeholder: tPayPal("clientIdPlaceholder"),
            },
            {
              key: "secret",
              label: tPayPal("secretLabel"),
              placeholder: tPayPal("secretPlaceholder"),
            },
          ],
          connectVia: tPayPal("connectVia"),
          howToGetCredential: tPayPal("howToGetCredential"),
          tutorialSteps: [
            tPayPal("tutorialStep1"),
            tPayPal("tutorialStep2"),
            tPayPal("tutorialStep3"),
            tPayPal("tutorialStep4"),
            tPayPal("tutorialStep5"),
            tPayPal("tutorialStep6"),
            tPayPal("tutorialStep7"),
            tPayPal("tutorialStep8"),
            tPayPal("tutorialStep9"),
          ],
          dashboardUrl: "https://developer.paypal.com/dashboard/applications",
          openDashboardLabel: tPayPal("openDashboard"),
          webhookEvents: PAYPAL_EVENTS,
          webhookStep1: tPayPal("webhookStep1"),
          webhookStep2: tPayPal("webhookStep2"),
          webhookStep3: tPayPal("webhookStep3"),
          webhookSecretPlaceholder: tPayPal("webhookSecretPlaceholder"),
          webhookWarning: tPayPal("webhookWarning"),
          toastId: "paypal-sync",
          disconnectConfirm: tPayPal("disconnectConfirm"),
          connectedToast: tPayPal("connectedToast"),
          connectErrorToast: tPayPal("connectErrorToast"),
          disconnectedToast: tPayPal("disconnectedToast"),
          onConnect: (orgId, cred) => {
            const c = cred as Record<string, string>;
            return connectPaypal(orgId, { clientId: c.clientId, secret: c.secret });
          },
          onSync: (orgId, integrationId) => syncPaypalHistory(orgId, integrationId),
        };

        const eduzzConfig: IntegrationDrawerConfig = {
          provider: "eduzz",
          providerName: "Eduzz",
          tagline: t("eduzzTagline"),
          accentColor: "#FF5722",
          logo: <EduzzLogoIcon />,
          credentialLabel: tEduzz("publicKeyLabel"),
          credentialPlaceholder: tEduzz("publicKeyPlaceholder"),
          credentialFields: [
            {
              key: "publicKey",
              label: tEduzz("publicKeyLabel"),
              placeholder: tEduzz("publicKeyPlaceholder"),
            },
            {
              key: "apiKey",
              label: tEduzz("apiKeyLabel"),
              placeholder: tEduzz("apiKeyPlaceholder"),
            },
          ],
          connectVia: tEduzz("connectVia"),
          howToGetCredential: tEduzz("howToGetCredential"),
          tutorialSteps: [
            tEduzz("tutorialStep1"),
            tEduzz("tutorialStep2"),
            tEduzz("tutorialStep3"),
            tEduzz("tutorialStep4"),
            tEduzz("tutorialStep5"),
            tEduzz("tutorialStep6"),
            tEduzz("tutorialStep7"),
            tEduzz("tutorialStep8"),
          ],
          dashboardUrl: "https://accounts.eduzz.com",
          openDashboardLabel: tEduzz("openDashboard"),
          webhookEvents: EDUZZ_EVENTS,
          webhookStep1: tEduzz("webhookStep1"),
          webhookStep2: tEduzz("webhookStep2"),
          webhookStep3: tEduzz("webhookStep3"),
          webhookSecretPlaceholder: tEduzz("webhookSecretPlaceholder"),
          webhookWarning: tEduzz("webhookWarning"),
          toastId: "eduzz-sync",
          disconnectConfirm: tEduzz("disconnectConfirm"),
          connectedToast: tEduzz("connectedToast"),
          connectErrorToast: tEduzz("connectErrorToast"),
          disconnectedToast: tEduzz("disconnectedToast"),
          onConnect: (orgId, cred) => {
            const c = cred as Record<string, string>;
            return connectEduzz(orgId, { publicKey: c.publicKey, apiKey: c.apiKey });
          },
          onSync: (orgId, integrationId) => syncEduzzHistory(orgId, integrationId),
        };

        const caktoConfig: IntegrationDrawerConfig = {
          provider: "cakto",
          providerName: "Cakto",
          tagline: t("caktoTagline"),
          accentColor: "#6C63FF",
          logo: <CaktoLogoIcon />,
          credentialLabel: tCakto("credentialLabel"),
          credentialPlaceholder: tCakto("credentialPlaceholder"),
          connectVia: tCakto("connectVia"),
          howToGetCredential: tCakto("howToGetCredential"),
          tutorialSteps: [
            tCakto("tutorialStep1"),
          ],
          dashboardUrl: "https://app.cakto.com.br",
          openDashboardLabel: tCakto("openDashboard"),
          webhookEvents: CAKTO_EVENTS,
          webhookStep1: tCakto("webhookStep1"),
          webhookStep2: tCakto("webhookStep2"),
          webhookStep3: tCakto("webhookStep3"),
          webhookSecretPlaceholder: tCakto("webhookSecretPlaceholder"),
          webhookWarning: tCakto("webhookWarning"),
          toastId: "cakto-sync",
          disconnectConfirm: tCakto("disconnectConfirm"),
          connectedToast: tCakto("connectedToast"),
          connectErrorToast: tCakto("connectErrorToast"),
          disconnectedToast: tCakto("disconnectedToast"),
          onConnect: (orgId, key) => connectCakto(orgId, key as string),
          onSync: (orgId, integrationId) => syncCaktoHistory(orgId, integrationId),
        };

        const kirvanoConfig: IntegrationDrawerConfig = {
          provider: "kirvano",
          providerName: "Kirvano",
          tagline: t("kirvanoTagline"),
          accentColor: "#00C9A7",
          logo: <KirvanoLogoIcon />,
          credentialLabel: tKirvano("credentialLabel"),
          credentialPlaceholder: tKirvano("credentialPlaceholder"),
          connectVia: tKirvano("connectVia"),
          howToGetCredential: tKirvano("howToGetCredential"),
          tutorialSteps: [
            tKirvano("tutorialStep1"),
          ],
          dashboardUrl: "https://app.kirvano.com",
          openDashboardLabel: tKirvano("openDashboard"),
          webhookEvents: KIRVANO_EVENTS,
          webhookStep1: tKirvano("webhookStep1"),
          webhookStep2: tKirvano("webhookStep2"),
          webhookStep3: tKirvano("webhookStep3"),
          webhookSecretPlaceholder: tKirvano("webhookSecretPlaceholder"),
          webhookWarning: tKirvano("webhookWarning"),
          toastId: "kirvano-sync",
          disconnectConfirm: tKirvano("disconnectConfirm"),
          connectedToast: tKirvano("connectedToast"),
          connectErrorToast: tKirvano("connectErrorToast"),
          disconnectedToast: tKirvano("disconnectedToast"),
          onConnect: (orgId, key) => connectKirvano(orgId, key as string),
          onSync: (orgId, integrationId) => syncKirvanoHistory(orgId, integrationId),
        };

        const abacatepayConfig: IntegrationDrawerConfig = {
          provider: "abacatepay",
          providerName: "Abacate Pay",
          tagline: t("abacatepayTagline"),
          accentColor: "#4CAF50",
          logo: <AbacatePayLogoIcon />,
          credentialLabel: tAbacatePay("credentialLabel"),
          credentialPlaceholder: tAbacatePay("credentialPlaceholder"),
          connectVia: tAbacatePay("connectVia"),
          howToGetCredential: tAbacatePay("howToGetCredential"),
          tutorialSteps: [
            tAbacatePay("tutorialStep1"),
            tAbacatePay("tutorialStep2"),
            tAbacatePay("tutorialStep3"),
          ],
          dashboardUrl: "https://app.abacatepay.com",
          openDashboardLabel: tAbacatePay("openDashboard"),
          webhookEvents: ABACATEPAY_EVENTS,
          webhookStep1: tAbacatePay("webhookStep1"),
          webhookStep2: tAbacatePay("webhookStep2"),
          webhookStep3: tAbacatePay("webhookStep3"),
          webhookSecretPlaceholder: tAbacatePay("webhookSecretPlaceholder"),
          webhookWarning: tAbacatePay("webhookWarning"),
          toastId: "abacatepay-sync",
          disconnectConfirm: tAbacatePay("disconnectConfirm"),
          connectedToast: tAbacatePay("connectedToast"),
          connectErrorToast: tAbacatePay("connectErrorToast"),
          disconnectedToast: tAbacatePay("disconnectedToast"),
          onConnect: (orgId, key) => connectAbacatePay(orgId, key as string),
          onSync: (orgId, integrationId) => syncAbacatePayHistory(orgId, integrationId),
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
                <IntegrationCard organizationId={org.id} config={mercadoPagoConfig} />
                <IntegrationCard organizationId={org.id} config={pagarmeConfig} />
                <IntegrationCard organizationId={org.id} config={kiwifyConfig} />
                <IntegrationCard organizationId={org.id} config={hotmartConfig} />
                <IntegrationCard organizationId={org.id} config={monetizzeConfig} />
                <IntegrationCard organizationId={org.id} config={pagbankConfig} />
                <IntegrationCard organizationId={org.id} config={guruConfig} />
                <IntegrationCard organizationId={org.id} config={paypalConfig} />
                <IntegrationCard organizationId={org.id} config={eduzzConfig} />
                <IntegrationCard organizationId={org.id} config={caktoConfig} />
                <IntegrationCard organizationId={org.id} config={kirvanoConfig} />
                <IntegrationCard organizationId={org.id} config={abacatepayConfig} />
              </div>
            </div>
          </div>
        );
      }}
    </SettingsSectionWrapper>
  );
}
