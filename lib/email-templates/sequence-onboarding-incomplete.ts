import { baseEmailLayout, ctaButton, divider, founderSignoff, unsubscribeFooter, type Locale } from "./base-layout";

export type OnboardingIncompleteEmailId =
  | "onboarding_incomplete_2h"
  | "onboarding_incomplete_24h"
  | "onboarding_incomplete_72h"
  | "onboarding_incomplete_7d";

export interface ISequenceOnboardingIncompleteEmailParams {
  emailId: OnboardingIncompleteEmailId;
  userName: string;
  orgName: string;
  currentStep?: string;
  onboardingUrl: string;
  unsubscribeUrl: string;
  locale?: Locale;
}

const translations = {
  pt: {
    onboarding_incomplete_2h: {
      subject: (step: string) => `Você parou no passo ${step} — leva 2 minutos para terminar`,
      greeting: (name: string) => `Oi, ${name},`,
      body: (orgName: string, step: string) =>
        `Acabei de ver que você criou sua conta para <strong style="color:#d4d4d8;">${orgName}</strong> mas parou no passo ${step} do setup.`,
      subBody:
        "São só 2 minutos para terminar — e assim que conectar, seus dados de receita já aparecem no dashboard em tempo real.",
      cta: "Continuar de onde parei →",
      previewText: (step: string) => `Você parou no passo ${step} — leva 2 minutos para terminar`,
    },
    onboarding_incomplete_24h: {
      subject: () => "Seus dados estão esperando por você",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "Vi que você ainda não terminou o setup do Groware. Queria te contar o que acontece quando você termina:",
      subBody:
        "O Groware importa seu histórico completo do Stripe ou Asaas automaticamente. MRR, churn, receita, assinaturas — tudo no dashboard sem precisar configurar nada à mão.",
      cta: "Completar o setup →",
      previewText: () => "Seus dados estão esperando por você",
    },
    onboarding_incomplete_72h: {
      subject: () => "Precisa de ajuda com o setup?",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "Sou o Flavio, criador do Groware. Notei que você criou sua conta há 3 dias mas ainda não terminou o setup.",
      subBody:
        "Travou em alguma coisa? Me responde esse email que eu te ajudo pessoalmente. Se preferir, posso fazer uma call de 10 minutos e configurar tudo junto com você.",
      cta: "Completar sozinho agora →",
      previewText: () => "Precisa de ajuda com o setup?",
    },
    onboarding_incomplete_7d: {
      subject: () => "Última chance — sua conta será arquivada",
      greeting: (name: string) => `Oi, ${name},`,
      body: () =>
        "Sua conta no Groware será arquivada em 7 dias por inatividade.",
      subBody:
        "Se ainda quer usar, basta completar o setup — leva 2 minutos. Se mudou de ideia, tudo bem — pode me responder e me contar o que faltou.",
      cta: "Manter minha conta →",
      previewText: () => "Última chance — sua conta será arquivada",
    },
  },
  en: {
    onboarding_incomplete_2h: {
      subject: (step: string) => `You stopped at step ${step} — takes 2 minutes to finish`,
      greeting: (name: string) => `Hi ${name},`,
      body: (orgName: string, step: string) =>
        `I noticed you created an account for <strong style="color:#d4d4d8;">${orgName}</strong> but stopped at step ${step} of the setup.`,
      subBody:
        "It only takes 2 more minutes to finish — and once you connect, your revenue data starts showing up in the dashboard right away.",
      cta: "Continue where I left off →",
      previewText: (step: string) => `You stopped at step ${step} — takes 2 minutes to finish`,
    },
    onboarding_incomplete_24h: {
      subject: () => "Your data is waiting for you",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "I noticed you haven't finished the Groware setup yet. I wanted to tell you what happens when you do:",
      subBody:
        "Groware automatically imports your full Stripe or Asaas history. MRR, churn, revenue, subscriptions — all in the dashboard without any manual configuration.",
      cta: "Complete the setup →",
      previewText: () => "Your data is waiting for you",
    },
    onboarding_incomplete_72h: {
      subject: () => "Need help with the setup?",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "I'm Flavio, the creator of Groware. I noticed you created your account 3 days ago but haven't finished the setup.",
      subBody:
        "Did something get in the way? Reply to this email and I'll help you personally. If you prefer, we can do a quick 10-minute call and configure everything together.",
      cta: "Complete it on my own →",
      previewText: () => "Need help with the setup?",
    },
    onboarding_incomplete_7d: {
      subject: () => "Last chance — your account will be archived",
      greeting: (name: string) => `Hi ${name},`,
      body: () =>
        "Your Groware account will be archived in 7 days due to inactivity.",
      subBody:
        "If you still want to use it, just complete the setup — it takes 2 minutes. If you changed your mind, that's totally okay — feel free to reply and tell me what was missing.",
      cta: "Keep my account →",
      previewText: () => "Last chance — your account will be archived",
    },
  },
} as const;

export function sequenceOnboardingIncompleteEmail(
  params: ISequenceOnboardingIncompleteEmailParams,
): string {
  const { emailId, userName, orgName, currentStep = "1", onboardingUrl, unsubscribeUrl } = params;
  const locale = params.locale ?? "pt";
  const t = translations[locale][emailId];
  const step = currentStep;

  const previewText =
    emailId === "onboarding_incomplete_2h"
      ? translations[locale].onboarding_incomplete_2h.previewText(step)
      : translations[locale][emailId].previewText();

  const bodyText =
    emailId === "onboarding_incomplete_2h"
      ? translations[locale].onboarding_incomplete_2h.body(orgName, step)
      : translations[locale][emailId].body();

  const content = `
    <p style="color:#fafafa; font-size:16px; font-weight:500; margin-bottom:20px; line-height:1.5;">
      ${t.greeting(userName)}
    </p>

    <p style="color:#a1a1aa; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${bodyText}
    </p>

    ${divider()}

    <p style="color:#71717a; font-size:14px; line-height:1.8; margin-bottom:0;">
      ${t.subBody}
    </p>

    ${emailId === "onboarding_incomplete_72h" ? `
    <p style="color:#71717a; font-size:14px; line-height:1.8; margin-top:16px; margin-bottom:0;">
      ${locale === "pt"
        ? 'Se preferir fazer sozinho, sem problema:'
        : 'If you prefer to do it yourself, no problem:'}
    </p>
    ` : ""}

    ${ctaButton(t.cta, onboardingUrl)}

    ${founderSignoff(locale)}

    ${unsubscribeFooter(unsubscribeUrl, locale)}
  `;

  return baseEmailLayout(content, locale, previewText);
}

export function getOnboardingIncompleteSubject(
  emailId: OnboardingIncompleteEmailId,
  locale: Locale,
  currentStep = "1",
): string {
  const t = translations[locale];
  if (emailId === "onboarding_incomplete_2h") return t.onboarding_incomplete_2h.subject(currentStep);
  if (emailId === "onboarding_incomplete_24h") return t.onboarding_incomplete_24h.subject();
  if (emailId === "onboarding_incomplete_72h") return t.onboarding_incomplete_72h.subject();
  return t.onboarding_incomplete_7d.subject();
}
