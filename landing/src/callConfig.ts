// ─────────────────────────────────────────────────────────────────────
// Single source of truth for EVA call configuration.
//
// An agent is just `{ assistantId, voiceId, language, typeSlug, ... }`.
// Everything else (login, WS URL, ASR/TTS model, country defaults, the
// sample greeting) is derived here so adding a new agent is a one-line
// change.
// ─────────────────────────────────────────────────────────────────────

import type { CallConfig } from "./verto";

// ── Fixed credentials (blackNgreen demo backend) ─────────────────────
export const WS_URL = "wss://eva-demo-backend.bngrenew.com:443/webrtc2";
export const LOGIN = "admin@";
export const PASSWD = "admin";
export const EMAIL_ID = "mohammad.omar@blackngreen.com";

// ── Params that never change across agents or languages ──────────────
const COMMON_PARAMS = {
  client: "demo",
  interface: "web",
  email_id: EMAIL_ID,
  id: 77,
  tts_model_name: "Eleven-Labs",
  asr_model: "Azure",
  user_selected_asr_model_LS: "Azure",
  user_selected_tts_model_LS: "Eleven-Labs",
  includeEnglishLanguage: false,
} as const;

// ── Language presets ─────────────────────────────────────────────────
// Pick a language code → display name, sample greeting, country, and
// the trilingual fallback set (country_specific_language_id) are all
// auto-filled. Add more entries here when you need more languages.

export interface LanguagePreset {
  languageCode: string;
  displayName: string;
  sampleText: string;
  countryCode: string;
  countrySpecificLanguageName: string;
  countrySpecificLanguageId: string;
  additionalLanguages: string[];
  userSelectedLanguageLS: string;
}

export const LANGUAGE_PRESETS: Record<string, LanguagePreset> = {
  "ar-MR": {
    languageCode: "ar-MR",
    displayName: "Arabic (Morocco) Hanaa (Female)",
    sampleText:
      "مرحبا! أنا إيفا. ماذا تريد أن تناقش؟ سواء كنت بحاجة إلى نصيحة، دردشة، أو مجرد شخص للتحدث معه، أنا هنا من أجلك!",
    countryCode: "MA",
    countrySpecificLanguageName: "Arabic (Morocco)",
    countrySpecificLanguageId: "ar-MA,fr-FR,en-US",
    additionalLanguages: ["fr-FR", "en-US"],
    userSelectedLanguageLS: "Arabic",
  },
  "ar-AE": {
    languageCode: "ar-AE",
    displayName: "Arabic (AE) Jessica (Female)",
    sampleText:
      "مرحباً! أنا إيفا. ماذا ترغب في مناقشته؟ سواء كنت بحاجة إلى نصيحة، أو محادثة، أو مجرد شخص للتحدث معه، أنا هنا من أجلك!",
    countryCode: "AE",
    countrySpecificLanguageName: "Arabic (UAE)",
    countrySpecificLanguageId: "ar-AE,en-US",
    additionalLanguages: ["en-US"],
    userSelectedLanguageLS: "Arabic",
  },
  "ar-SA": {
    languageCode: "ar-SA",
    displayName: "Arabic (Saudi) (Female)",
    sampleText: "مرحباً! أنا إيفا. كيف يمكنني مساعدتك اليوم؟",
    countryCode: "SA",
    countrySpecificLanguageName: "Arabic (Saudi Arabia)",
    countrySpecificLanguageId: "ar-SA,en-US",
    additionalLanguages: ["en-US"],
    userSelectedLanguageLS: "Arabic",
  },
  "en-US": {
    languageCode: "en-US",
    displayName: "English (US) (Female)",
    sampleText:
      "Hi! I'm MIA. What would you like to talk about? Whether you need advice, a chat, or just someone to listen — I'm here for you.",
    countryCode: "US",
    countrySpecificLanguageName: "English (US)",
    countrySpecificLanguageId: "en-US",
    additionalLanguages: [],
    userSelectedLanguageLS: "English",
  },
  "fr-FR": {
    languageCode: "fr-FR",
    displayName: "French (France) (Female)",
    sampleText:
      "Bonjour ! Je suis MIA. De quoi aimeriez-vous parler ? Que vous ayez besoin d'un conseil, d'une discussion ou simplement de quelqu'un à qui parler, je suis là pour vous.",
    countryCode: "FR",
    countrySpecificLanguageName: "French (France)",
    countrySpecificLanguageId: "fr-FR,en-US",
    additionalLanguages: ["en-US"],
    userSelectedLanguageLS: "French",
  },
  // Orange Maroc preset — French primary, country MA (Morocco).
  // ⚠️ PLACEHOLDER VALUES — overwrite displayName / sampleText / voice
  // and any other fields once the real Orange Maroc JSON spec arrives.
  "fr-MA": {
    languageCode: "fr-FR",
    displayName: "French (France) (Female)",
    sampleText:
      "Bonjour ! Je suis EVA, votre assistante vocale Orange Maroc. Comment puis-je vous aider aujourd'hui ?",
    countryCode: "MA",
    countrySpecificLanguageName: "French (France)",
    countrySpecificLanguageId: "fr-FR",
    additionalLanguages: [],
    userSelectedLanguageLS: "French",
  },
};

/** Friendly labels for the Language dropdown in the builder UI. */
export const LANGUAGE_OPTIONS: { code: string; label: string }[] = Object.entries(
  LANGUAGE_PRESETS
).map(([code, p]) => ({ code, label: p.displayName }));

// ── Agent spec → CallConfig ──────────────────────────────────────────

export interface AgentSpec {
  assistantId: string;
  voiceId: string;
  /** Must be a key of `LANGUAGE_PRESETS`. */
  language: string;
  typeSlug: string;
  /** Optional override for display name (defaults to language preset). */
  voiceDisplayName?: string;
  /** Optional override for TTS voice gender. */
  gender?: "Female" | "Male";
}

export const buildCallConfig = (spec: AgentSpec): CallConfig => {
  const lang = LANGUAGE_PRESETS[spec.language];
  if (!lang) {
    throw new Error(
      `Unknown language "${spec.language}". Add it to LANGUAGE_PRESETS in callConfig.ts.`
    );
  }

  // `loginParams` and `userVariables` carry the exact same payload —
  // this matched tryeva's original behavior (verified by reverse-engineering
  // the bundle) and both are required for the backend to route the call.
  const params = {
    ...COMMON_PARAMS,
    mwc_assistant_id: spec.assistantId,
    voice_name: spec.voiceId,
    language_code: lang.languageCode,
    language_display_name: spec.voiceDisplayName ?? lang.displayName,
    sample_text: lang.sampleText,
    country_code: lang.countryCode,
    country_specific_language_name: lang.countrySpecificLanguageName,
    country_specific_language_id: lang.countrySpecificLanguageId,
    // Only include `additionalLanguages` when there's actually a fallback
    // language to send. For Moov Mauritel (French-only) the field is
    // omitted entirely so the payload stays Hindi-free.
    ...(lang.additionalLanguages.length > 0
      ? { additionalLanguages: lang.additionalLanguages }
      : {}),
    user_selected_language_LS: lang.userSelectedLanguageLS,
    gender: spec.gender ?? "Female",
    type: spec.typeSlug,
  };

  return {
    wsUrl: WS_URL,
    login: LOGIN,
    passwd: PASSWD,
    loginParams: params,
    userVariables: params,
  };
};
