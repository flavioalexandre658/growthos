import { baseEmailLayout, ctaButton, divider, founderSignoff, unsubscribeFooter, type Locale } from "./base-layout";

export type GatewayOnlyEmailId =
  | "gateway_only_48h"
  | "gateway_only_5d"
  | "gateway_only_10d";

export interface ISequenceGatewayOnlyEmailParams {
  emailId: GatewayOnlyEmailId;
  userName: string;
  orgName: string;
  revenueFormatted?: string;
  trackerUrl: string;
  unsubscribeUrl: string;
  locale?: Locale;
}

const translations = {
  pt: {
    gateway_only_48h: {
      subject: "Você sabe quanto faturou. Mas sabe de onde veio?",
      greeting: (name: string) => `Oi, ${name},`,
      body: (revenue: string) =>
        `Seu dashboard já mostra <strong style="color:#d4d4d8;">${revenue}</strong> de receita no último mês.`,
      subBody:
        "Mas sem o tracker.js, todos os canais aparecem como 'Direto' — você não sabe se veio do Google, Instagram ou indicação.",
      subBody2:
        "Instale o tracker em 2 minutos e descubra qual canal gera mais receita para o seu negócio.",
      cta: "Instalar tracker.js →",
      previewText: "Você sabe quanto faturou. Mas sabe de onde veio?",
    },
    gateway_only_5d: {
      subject: "Prompt para IA: instale o tracker em 30 segundos",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "Sabia que você pode instalar o tracker.js colando um único prompt no Cursor ou Claude?",
      subBody:
        "Nossa documentação tem o prompt pronto. A IA lê as instruções e implementa automaticamente no seu projeto. Você não precisa mexer em nenhuma linha de código.",
      cta: "Ver instruções de instalação →",
      previewText: "Prompt para IA: instale o tracker em 30 segundos",
    },
    gateway_only_10d: {
      subject: "Sua campanha de ads está dando retorno?",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "Se você investe em Google Ads, Meta Ads ou qualquer canal pago, sem o tracker.js é impossível saber o retorno real.",
      subBody:
        "Com o tracker instalado, o Groware atribui cada real de receita ao canal que trouxe o cliente — incluindo UTMs das suas campanhas.",
      cta: "Configurar rastreamento →",
      previewText: "Sua campanha de ads está dando retorno?",
    },
  },
  en: {
    gateway_only_48h: {
      subject: "You know how much you made. But do you know where it came from?",
      greeting: (name: string) => `Hi ${name},`,
      body: (revenue: string) =>
        `Your dashboard already shows <strong style="color:#d4d4d8;">${revenue}</strong> in revenue last month.`,
      subBody:
        "But without tracker.js, all channels show as 'Direct' — you don't know if it came from Google, Instagram, or referrals.",
      subBody2:
        "Install the tracker in 2 minutes and discover which channel generates the most revenue for your business.",
      cta: "Install tracker.js →",
      previewText: "You know how much you made. But do you know where it came from?",
    },
    gateway_only_5d: {
      subject: "AI prompt: install the tracker in 30 seconds",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "Did you know you can install tracker.js by pasting a single prompt into Cursor or Claude?",
      subBody:
        "Our docs have the prompt ready to go. The AI reads the instructions and automatically implements it in your project. You don't need to touch a single line of code.",
      cta: "View installation instructions →",
      previewText: "AI prompt: install the tracker in 30 seconds",
    },
    gateway_only_10d: {
      subject: "Is your ads campaign delivering returns?",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "If you invest in Google Ads, Meta Ads, or any paid channel, without tracker.js it's impossible to know the real return.",
      subBody:
        "With the tracker installed, Groware attributes every dollar of revenue to the channel that brought the customer — including your campaign UTMs.",
      cta: "Set up tracking →",
      previewText: "Is your ads campaign delivering returns?",
    },
  },
} as const;

export function sequenceGatewayOnlyEmail(
  params: ISequenceGatewayOnlyEmailParams,
): string {
  const { emailId, userName, orgName, revenueFormatted = "R$ 0,00", trackerUrl, unsubscribeUrl } = params;
  const locale = params.locale ?? "pt";
  const t = translations[locale][emailId];

  const bodyText =
    emailId === "gateway_only_48h"
      ? translations[locale].gateway_only_48h.body(revenueFormatted)
      : translations[locale][emailId].body();

  const content = `
    <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:4px; line-height:1.5;">
      ${t.greeting(userName)}
    </p>
    <p style="color:#52525b; font-size:12px; margin-bottom:20px;">${orgName}</p>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${bodyText}
    </p>

    ${divider()}

    <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${t.subBody}
    </p>

    ${"subBody2" in t ? `<p style="color:#71717a; font-size:14px; line-height:1.8; margin-top:14px;">${t.subBody2}</p>` : ""}

    ${ctaButton(t.cta, trackerUrl)}

    ${founderSignoff(locale)}

    ${unsubscribeFooter(unsubscribeUrl, locale)}
  `;

  return baseEmailLayout(content, locale, t.previewText);
}

export function getGatewayOnlySubject(
  emailId: GatewayOnlyEmailId,
  locale: Locale,
): string {
  return translations[locale][emailId].subject;
}
