// ─────────────────────────────────────────────────────────────────────
// Agent catalogue — Orange Maroc demo.
//
// ⚠️ PLACEHOLDERS: `assistantId`, `voiceId` and `typeSlug` below are
// guesses based on the Moov naming convention. Replace them with the
// real values from the Orange Maroc backend JSON spec before this build
// goes live.
// ─────────────────────────────────────────────────────────────────────

import { buildCallConfig, type AgentSpec } from "./callConfig";
import type { CallConfig } from "./verto";

export type AgentFlavor = "companion" | "assistant";

export interface Agent extends AgentSpec {
  id: string;
  name: string;
  /** Long-form paragraph used when no `bullets` are supplied. */
  description: string;
  /** Optional bullet list shown instead of `description` on the call screen. */
  bullets?: string[];
  flavor: AgentFlavor;
}

export const agents: Agent[] = [
  {
    id: "personal-assistant",
    name: "Personal Assistant",
    description:
      "Your Orange Maroc personal assistant — answers calls when you're busy, takes notes, delivers messages, and checks availability for you.",
    bullets: [
      "Answers your calls when you're busy",
      "Takes notes during the conversation",
      "Delivers messages, checks availability and more",
    ],
    flavor: "assistant",
    // TODO replace with real Orange Maroc backend values
    assistantId: "PLACEHOLDER_PA_ID",
    voiceId: "PLACEHOLDER_VOICE_ID",
    language: "fr-MA",
    typeSlug: "orange---maroc---personal-assistant",
  },
  {
    id: "ai-companion",
    name: "AI Companion",
    description:
      "Ask EVA anything. A smart, general-purpose voice companion for Orange Maroc — answers open questions, shares live news and events, explains and informs, and is trained to skip restricted topics.",
    flavor: "companion",
    // TODO replace with real Orange Maroc backend values
    assistantId: "PLACEHOLDER_AC_ID",
    voiceId: "PLACEHOLDER_VOICE_ID",
    language: "fr-MA",
    typeSlug: "orange---maroc---ai-companion",
  },
];

/** Resolve the full Verto `CallConfig` for an agent. */
export const getCallConfig = (agent: Agent): CallConfig => buildCallConfig(agent);
